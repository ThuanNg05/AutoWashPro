using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Services;
using Auto_Wash.Hubs;
using Auto_Wash.Helpers;
using System.IO;
using System.Collections.Generic;
using System.Linq;

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
            builder.Services.AddControllersWithViews();

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

            // Vehicle Ownership Transfer registrations
            builder.Services.AddScoped<OwnershipTransferService>();


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

            // Configure Swagger UI
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
                {
                    Title = "Auto-Wash Pro API Specification",
                    Version = "v1",
                    Description = "API documentation for the Auto-Wash Pro smart car wash management system."
                });

                // Load XML documentation comments
                var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
                var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                if (File.Exists(xmlPath))
                {
                    options.IncludeXmlComments(xmlPath);
                }

                // Document Cookie/Session authentication inside Swagger UI
                options.AddSecurityDefinition("CookieAuth", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                    In = Microsoft.OpenApi.Models.ParameterLocation.Cookie,
                    Name = ".AspNetCore.Session",
                    Description = "Session Cookie generated after login. Browser automatically sends this cookie."
                });

                options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                    {
                        new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                        {
                            Reference = new Microsoft.OpenApi.Models.OpenApiReference { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "CookieAuth" }
                        },
                        new string[] { }
                    }
                });
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Auto-Wash Pro API v1");
                    c.RoutePrefix = "swagger";
                });
            }
            else
            {
                app.UseHsts();
                app.UseHttpsRedirection();
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
            await app.RunAsync();
        }
    }
}
