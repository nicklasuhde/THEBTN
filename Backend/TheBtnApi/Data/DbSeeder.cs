using Microsoft.AspNetCore.Identity;
using TheBtnApi.Models;

namespace TheBtnApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = serviceProvider.GetRequiredService<ILogger<ApplicationDbContext>>();

        await SeedAdminUserAsync(userManager, logger);
    }

    private static async Task SeedAdminUserAsync(
        UserManager<ApplicationUser> userManager,
        ILogger logger)
    {
        const string adminEmail = "admin@thebtn.com";
        const string adminPassword = "Admin123!";

        var existingUser = await userManager.FindByEmailAsync(adminEmail);
        if (existingUser != null)
        {
            logger.LogInformation("Admin user already exists");
            return;
        }

        var adminUser = new ApplicationUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            FirstName = "Admin",
            LastName = "User",
            EmailConfirmed = true // Pre-verified
        };

        var result = await userManager.CreateAsync(adminUser, adminPassword);

        if (result.Succeeded)
        {
            logger.LogInformation("Admin user created: {Email}", adminEmail);
        }
        else
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            logger.LogError("Failed to create admin user: {Errors}", errors);
        }
    }
}
