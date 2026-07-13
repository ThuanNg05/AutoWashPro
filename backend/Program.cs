using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Services;
using Auto_Wash.Hubs;
using Auto_Wash.Helpers;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using Microsoft.OpenApi.Models;
using System.Reflection;

namespace Auto_Wash
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            // All DB columns are "timestamp without time zone"; this makes Npgsql 6+ treat
            // DateTime values as local timestamps (no UTC conversion) to match that schema.
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

            var builder = WebApplication.CreateBuilder(args);

            builder.Configuration
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddJsonFile(
                    $"appsettings.{builder.Environment.EnvironmentName}.json",
                    optional: true,
                    reloadOnChange: true);

            if (builder.Environment.IsDevelopment())
            {
                builder.Configuration.AddUserSecrets<Program>();
            }

            builder.Configuration.AddEnvironmentVariables();

            // Register Custom File Logger Provider
            var debugBePath = Path.Combine(builder.Environment.ContentRootPath, "debug_be.log");
            builder.Logging.AddProvider(new FileLoggerProvider(debugBePath));

            // Add services to the container.
            builder.Services.AddControllersWithViews()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
                });

            // Register SwaggerGen
            builder.Services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "Auto-Wash Pro API Documentation",
                    Version = "v1",
                    Description = "API documentation for the Auto-Wash Pro smart car wash management system."
                });

                // Load XML comments for Swagger UI summaries
                var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                if (File.Exists(xmlPath))
                {
                    options.IncludeXmlComments(xmlPath);
                }

                // Setup Cookie authentication representation in Swagger
                options.AddSecurityDefinition("CookieAuth", new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.ApiKey,
                    In = ParameterLocation.Cookie,
                    Name = ".AspNetCore.Session",
                    Description = "ASP.NET Core Session Cookie (.AspNetCore.Session) after logging in via /Account/Login."
                });

                options.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "CookieAuth" }
                        },
                        new string[] { }
                    }
                });
            });

            // Real-time push (replaces/augments timer polling for new-booking detection)
            builder.Services.AddSignalR();

            // Register CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("ReactPolicy", policy =>
                {
                    policy.WithOrigins(
                              "http://localhost:5173",
                              "http://127.0.0.1:5173",
                              "http://localhost:3000"
                          )
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
                });
            });

            builder.Services.AddDbContext<AutoWashDbContext>(options =>
            {
                var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

                options.UseNpgsql(connectionString, npgsqlOpts =>
                {
                    npgsqlOpts.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(30),
                        errorCodesToAdd: null);
                })
                .UseLowerCaseNamingConvention();
            });

            // Configure PayOS Settings
            builder.Services.Configure<Auto_Wash.Helpers.PayOSSettings>(builder.Configuration.GetSection("PayOSSettings"));

            // Register PayOSClient Singleton
            builder.Services.AddSingleton(provider =>
            {
                var settings = provider.GetRequiredService<Microsoft.Extensions.Options.IOptions<Auto_Wash.Helpers.PayOSSettings>>().Value;
                return new PayOS.PayOSClient(settings.ClientId, settings.ApiKey, settings.ChecksumKey);
            });

            // Register HttpContextAccessor and Services
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddScoped<AuthContextService>();
            builder.Services.AddScoped<AccountService>();
            builder.Services.AddScoped<VehicleService>();
            builder.Services.AddScoped<OtpService>();
            builder.Services.AddScoped<WelcomeRewardService>();

            // Vehicle Ownership Transfer registrations
            // NOTE: MockOcrService is used here (net8.0 target).
            // WindowsOcrService requires net8.0-windows and is only available in branch 56.
            builder.Services.AddScoped<IOcrService, MockOcrService>();
            builder.Services.AddScoped<OwnershipTransferService>();
            builder.Services.AddHostedService<OwnershipTransferBackgroundService>();

            builder.Services.AddScoped<Auto_Wash.Services.BookingService>();
            builder.Services.AddScoped<AdminQueueService>();
            builder.Services.AddScoped<CustomerService>();
            builder.Services.AddScoped<AdminService>();
            builder.Services.AddScoped<AdminBookingService>();
            builder.Services.AddScoped<BookingNotificationService>();
            builder.Services.AddScoped<LoyaltyTierService>();
            builder.Services.AddScoped<IPaymentService, PaymentService>();
            builder.Services.AddSingleton<IBookingRealtimeNotifier, BookingRealtimeNotifier>();
            builder.Services.AddHostedService<BookingWorkflowBackgroundService>();


            builder.Services.AddHealthChecks();

            // Session support
            builder.Services.AddDistributedMemoryCache();
            builder.Services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromHours(8);
                options.Cookie.HttpOnly = true;
                options.Cookie.IsEssential = true;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
            });

            var app = builder.Build();

            // Centralized global exception handler
            app.UseMiddleware<GlobalExceptionMiddleware>();

            // Configure the HTTP request pipeline.
            if (!app.Environment.IsDevelopment())
            {
                app.UseHsts();
                app.UseHttpsRedirection();
            }
            else
            {
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Auto-Wash Pro API v1");
                    c.RoutePrefix = "swagger";
                });
            }

            app.UseDefaultFiles(); // Enables serving index.html as default page
            app.UseStaticFiles();

            app.UseRouting();

            app.UseCors("ReactPolicy");

            app.UseSession();

            app.UseAuthorization();

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");

            app.MapHub<BookingHub>("/hubs/bookings"); // Real-time booking events (staff/admin)

            app.MapFallbackToFile("index.html"); // Fallback for React Router client routes
            app.MapHealthChecks("/api/health");
            await app.RunAsync();
        }
    }
}
