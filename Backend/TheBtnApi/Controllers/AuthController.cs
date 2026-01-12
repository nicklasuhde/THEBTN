using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using TheBtnApi.DTOs;
using TheBtnApi.Models;
using TheBtnApi.Services;

namespace TheBtnApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IJwtService _jwtService;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IJwtService jwtService,
        IEmailService emailService,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtService = jwtService;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return BadRequest(new AuthResponse
            {
                Success = false,
                Message = "En användare med denna e-postadress finns redan."
            });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return BadRequest(new AuthResponse
            {
                Success = false,
                Message = errors
            });
        }

        // Generate email verification token
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);

        try
        {
            await _emailService.SendVerificationEmailAsync(user.Email!, user.Id, token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email");
            // Don't fail registration if email fails
        }

        _logger.LogInformation("User registered: {Email}", user.Email);

        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Konto skapat! Kolla din e-post för att verifiera kontot.",
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email!,
                FirstName = user.FirstName,
                LastName = user.LastName,
                EmailConfirmed = false
            }
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Unauthorized(new AuthResponse
            {
                Success = false,
                Message = "Felaktig e-postadress eller lösenord."
            });
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
        {
            return Unauthorized(new AuthResponse
            {
                Success = false,
                Message = "Kontot är låst. Försök igen senare."
            });
        }

        if (!result.Succeeded)
        {
            return Unauthorized(new AuthResponse
            {
                Success = false,
                Message = "Felaktig e-postadress eller lösenord."
            });
        }

        if (!user.EmailConfirmed)
        {
            return Unauthorized(new AuthResponse
            {
                Success = false,
                Message = "Verifiera din e-postadress innan du loggar in."
            });
        }

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var token = _jwtService.GenerateToken(user);

        _logger.LogInformation("User logged in: {Email}", user.Email);

        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Inloggning lyckades!",
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email!,
                FirstName = user.FirstName,
                LastName = user.LastName,
                EmailConfirmed = user.EmailConfirmed
            }
        });
    }

    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string userId, [FromQuery] string token)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return BadRequest("Ogiltig användare.");
        }

        var result = await _userManager.ConfirmEmailAsync(user, token);
        if (!result.Succeeded)
        {
            return BadRequest("Ogiltig eller utgången verifieringslänk.");
        }

        _logger.LogInformation("Email verified for user: {Email}", user.Email);

        // Redirect to app or show success page
        return Ok(new { message = "E-postadressen har verifierats! Du kan nu logga in." });
    }

    [HttpPost("resend-verification")]
    public async Task<ActionResult<AuthResponse>> ResendVerification([FromBody] ResendVerificationRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            // Don't reveal if user exists
            return Ok(new AuthResponse
            {
                Success = true,
                Message = "Om e-postadressen finns skickas ett nytt verifieringsmeddelande."
            });
        }

        if (user.EmailConfirmed)
        {
            return Ok(new AuthResponse
            {
                Success = true,
                Message = "E-postadressen är redan verifierad."
            });
        }

        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        await _emailService.SendVerificationEmailAsync(user.Email!, user.Id, token);

        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Ett nytt verifieringsmeddelande har skickats."
        });
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<AuthResponse>> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || !user.EmailConfirmed)
        {
            // Don't reveal if user exists
            return Ok(new AuthResponse
            {
                Success = true,
                Message = "Om e-postadressen finns skickas instruktioner för att återställa lösenordet."
            });
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        await _emailService.SendPasswordResetEmailAsync(user.Email!, user.Id, token);

        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Instruktioner har skickats till din e-postadress."
        });
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<AuthResponse>> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null)
        {
            return BadRequest(new AuthResponse
            {
                Success = false,
                Message = "Ogiltig begäran."
            });
        }

        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return BadRequest(new AuthResponse
            {
                Success = false,
                Message = errors
            });
        }

        _logger.LogInformation("Password reset for user: {Email}", user.Email);

        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Lösenordet har återställts. Du kan nu logga in."
        });
    }
}
