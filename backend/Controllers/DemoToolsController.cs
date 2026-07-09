using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Auto_Wash.Data;

namespace Auto_Wash.Controllers
{
    /// <summary>
    /// Demo-only tools: browse and edit raw database tables from the admin UI
    /// so demo scenarios (booking times, statuses...) can be tweaked without
    /// opening Supabase directly.
    /// </summary>
    public class DemoToolsController : Controller
    {
        private readonly AutoWashDbContext _context;

        public DemoToolsController(AutoWashDbContext context)
        {
            _context = context;
        }

        private bool IsAdminOrStaff()
        {
            var role = HttpContext.Session.GetString("UserRole");
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "staff", StringComparison.OrdinalIgnoreCase);
        }
    }
}
