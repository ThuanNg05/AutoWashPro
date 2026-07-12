using Microsoft.Extensions.Logging;
using System;
using System.IO;

namespace Auto_Wash.Helpers
{
    public class FileLogger : ILogger
    {
        private readonly string _logDirectory;
        private static readonly object _lock = new object();

        public FileLogger(string logDirectory)
        {
            _logDirectory = logDirectory;
        }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Information;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (formatter == null) return;
            var message = formatter(state, exception);
            if (string.IsNullOrEmpty(message) && exception == null) return;

            var logRecord = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] [{logLevel}] {message}";
            if (exception != null)
            {
                logRecord += Environment.NewLine + exception.ToString();
            }

            // Sinh tên file log động theo ngày hiện tại: debug_be_yyyy_MM_dd.log
            var logFileName = $"debug_be_{DateTime.Today:yyyy_MM_dd}.log";
            var filePath = Path.Combine(_logDirectory, logFileName);

            lock (_lock)
            {
                try
                {
                    // Tự động tạo thư mục log nếu chưa tồn tại
                    if (!Directory.Exists(_logDirectory))
                    {
                        Directory.CreateDirectory(_logDirectory);
                    }
                    File.AppendAllText(filePath, logRecord + Environment.NewLine);
                }
                catch
                {
                    // Fail silently to prevent application crashes during logging
                }
            }
        }
    }

    public class FileLoggerProvider : ILoggerProvider
    {
        private readonly string _logDirectory;

        public FileLoggerProvider(string logDirectory)
        {
            _logDirectory = logDirectory;
        }

        public ILogger CreateLogger(string categoryName)
        {
            return new FileLogger(_logDirectory);
        }

        public void Dispose() { }
    }

    public static class FileLoggerExtensions
    {
        public static ILoggingBuilder AddFile(this ILoggingBuilder builder, string logDirectory)
        {
            builder.AddProvider(new FileLoggerProvider(logDirectory));
            return builder;
        }
    }
}