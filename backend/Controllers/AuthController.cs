using System.Security.Claims;
using System.Text.RegularExpressions;
using backend.Models.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("auth")]
    public partial class AuthController : Controller
    {
        // Profiles are user-managed at runtime (create/rename from the TV), so the
        // AppUser table — not config — is the source of truth. Config profiles are
        // only used to seed the table on first run (see ProfileSeeder).
        public const int MaxProfiles = 5;
        public const int NameMinLength = 2;
        public const int NameMaxLength = 16;

        private readonly UserManager<AppUser> _users;

        public AuthController(UserManager<AppUser> users)
        {
            _users = users;
        }

        public record ProfileDto(string Id, string Name, string? AvatarUrl);
        public record LoginRequest(string ProfileId);
        public record CreateProfileRequest(string Name, string? AvatarUrl);
        public record RenameProfileRequest(string Name, string? AvatarUrl);

        // Avatars are a fixed set of images bundled with the frontend; only
        // accept paths into that set so arbitrary URLs can't be stored.
        [GeneratedRegex(@"^/avatars/[a-z0-9-]{1,64}\.svg$")]
        private static partial Regex AvatarPathRegex();

        private static bool IsValidAvatar(string? avatarUrl) =>
            avatarUrl is null || AvatarPathRegex().IsMatch(avatarUrl);

        private static string ProfileName(AppUser u) =>
            string.IsNullOrWhiteSpace(u.DisplayName) ? u.UserName ?? u.Id : u.DisplayName;

        // null when valid, otherwise the trimmed name; validation error returned via out.
        private static bool TryValidateName(string? raw, out string name, out string? error)
        {
            name = (raw ?? "").Trim();
            if (name.Length < NameMinLength || name.Length > NameMaxLength)
            {
                error = "invalid_name";
                return false;
            }
            error = null;
            return true;
        }

        [AllowAnonymous]
        [HttpGet("profiles")]
        public async Task<IActionResult> Profiles()
        {
            var profiles = await _users.Users
                .OrderBy(u => u.DisplayName)
                .Select(u => new ProfileDto(u.Id, u.DisplayName ?? u.UserName ?? u.Id, u.AvatarUrl))
                .ToListAsync();
            return Ok(profiles);
        }

        [AllowAnonymous]
        [HttpPost("profiles")]
        public async Task<IActionResult> CreateProfile([FromBody] CreateProfileRequest request)
        {
            if (!TryValidateName(request?.Name, out var name, out var error))
                return BadRequest(new { error });

            if (!IsValidAvatar(request?.AvatarUrl))
                return BadRequest(new { error = "invalid_avatar" });

            if (await _users.Users.CountAsync() >= MaxProfiles)
                return Conflict(new { error = "max_profiles" });

            var user = new AppUser
            {
                Id = Guid.NewGuid().ToString(),
                UserName = Guid.NewGuid().ToString(),
                DisplayName = name,
                AvatarUrl = request?.AvatarUrl
            };
            var result = await _users.CreateAsync(user);
            if (!result.Succeeded)
                return BadRequest(new { error = "create_failed" });

            return Ok(new ProfileDto(user.Id, name, user.AvatarUrl));
        }

        [AllowAnonymous]
        [HttpPatch("profiles/{id}")]
        public async Task<IActionResult> RenameProfile(string id, [FromBody] RenameProfileRequest request)
        {
            if (!TryValidateName(request?.Name, out var name, out var error))
                return BadRequest(new { error });

            if (!IsValidAvatar(request?.AvatarUrl))
                return BadRequest(new { error = "invalid_avatar" });

            var user = await _users.FindByIdAsync(id);
            if (user is null)
                return NotFound(new { error = "unknown_profile" });

            user.DisplayName = name;
            user.AvatarUrl = request?.AvatarUrl;
            var result = await _users.UpdateAsync(user);
            if (!result.Succeeded)
                return BadRequest(new { error = "rename_failed" });

            return Ok(new ProfileDto(user.Id, name, user.AvatarUrl));
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request is null || string.IsNullOrWhiteSpace(request.ProfileId))
                return BadRequest(new { error = "missing_profile" });

            var profile = await _users.FindByIdAsync(request.ProfileId);
            if (profile is null)
                return NotFound(new { error = "unknown_profile" });

            var profileName = ProfileName(profile);
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, profile.Id),
                new(ClaimTypes.Name, profileName)
            };
            if (!string.IsNullOrEmpty(profile.AvatarUrl))
                claims.Add(new("picture", profile.AvatarUrl));

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal,
                new AuthenticationProperties
                {
                    IsPersistent = true,
                    ExpiresUtc = DateTimeOffset.UtcNow.AddDays(30)
                });

            return Ok(new
            {
                id = profile.Id,
                name = profileName,
                picture = profile.AvatarUrl
            });
        }

        [HttpGet("me")]
        public IActionResult Me()
        {
            if (User?.Identity?.IsAuthenticated != true)
                return Unauthorized(new { isAuthenticated = false });

            return Ok(new
            {
                isAuthenticated = true,
                id = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                name = User.Identity!.Name,
                picture = User.FindFirst("picture")?.Value
            });
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Ok();
        }
    }
}
