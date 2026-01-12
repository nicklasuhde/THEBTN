using System.Net;
using System.Net.Mail;

namespace TheBtnApi.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
        var smtpUser = _configuration["Email:SmtpUser"] ?? "";
        var smtpPass = _configuration["Email:SmtpPass"] ?? "";
        var fromEmail = _configuration["Email:FromEmail"] ?? smtpUser;
        var fromName = _configuration["Email:FromName"] ?? "THE BTN";

        try
        {
            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(smtpUser, smtpPass),
                EnableSsl = true
            };

            var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(to);

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {Email}", to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", to);
            throw;
        }
    }

    public async Task SendVerificationEmailAsync(string email, string userId, string token)
    {
        var baseUrl = _configuration["App:BaseUrl"] ?? "http://localhost:5000";
        var encodedToken = WebUtility.UrlEncode(token);
        var verificationUrl = $"{baseUrl}/api/auth/verify-email?userId={userId}&token={encodedToken}";

        var htmlBody = $@"
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }}
                .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class='container'>
                <h1>Välkommen till THE BTN!</h1>
                <p>Tack för att du registrerade dig. Klicka på knappen nedan för att verifiera din e-postadress:</p>
                <p><a href='{verificationUrl}' class='button'>Verifiera e-post</a></p>
                <p>Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:</p>
                <p><small>{verificationUrl}</small></p>
                <div class='footer'>
                    <p>Om du inte skapade detta konto kan du ignorera detta meddelande.</p>
                </div>
            </div>
        </body>
        </html>";

        await SendEmailAsync(email, "Verifiera din e-postadress - THE BTN", htmlBody);
    }

    public async Task SendPasswordResetEmailAsync(string email, string userId, string token)
    {
        var baseUrl = _configuration["App:BaseUrl"] ?? "http://localhost:5000";
        var encodedToken = WebUtility.UrlEncode(token);
        var resetUrl = $"{baseUrl}/reset-password?userId={userId}&token={encodedToken}";

        var htmlBody = $@"
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; }}
                .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class='container'>
                <h1>Återställ lösenord</h1>
                <p>Du har begärt att återställa ditt lösenord. Klicka på knappen nedan:</p>
                <p><a href='{resetUrl}' class='button'>Återställ lösenord</a></p>
                <p>Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:</p>
                <p><small>{resetUrl}</small></p>
                <div class='footer'>
                    <p>Om du inte begärde detta kan du ignorera detta meddelande.</p>
                    <p>Länken är giltig i 24 timmar.</p>
                </div>
            </div>
        </body>
        </html>";

        await SendEmailAsync(email, "Återställ lösenord - THE BTN", htmlBody);
    }
}
