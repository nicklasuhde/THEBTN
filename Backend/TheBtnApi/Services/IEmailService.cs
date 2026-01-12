namespace TheBtnApi.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string htmlBody);
    Task SendVerificationEmailAsync(string email, string userId, string token);
    Task SendPasswordResetEmailAsync(string email, string userId, string token);
}
