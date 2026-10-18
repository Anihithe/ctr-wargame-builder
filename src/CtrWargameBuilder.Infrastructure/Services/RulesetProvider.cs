using System.Text.Json;
using CtrWargameBuilder.Application.Interfaces;
using CtrWargameBuilder.Domain.Models.Ruleset;

namespace CtrWargameBuilder.Infrastructure.Services;

public class RulesetProvider : IRulesetProvider
{
    private readonly string _rulesetDirectory;
    private readonly Dictionary<string, GameRuleset> _cache = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _lock = new();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public RulesetProvider(string? customRulesetDirectory = null)
    {
        if (!string.IsNullOrWhiteSpace(customRulesetDirectory) && Directory.Exists(customRulesetDirectory))
        {
            _rulesetDirectory = customRulesetDirectory;
        }
        else
        {
            // Climb up directory tree to locate 'rulesets' folder
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            string? found = null;
            while (dir != null)
            {
                var candidate = Path.Combine(dir.FullName, "rulesets");
                if (Directory.Exists(candidate))
                {
                    found = candidate;
                    break;
                }
                dir = dir.Parent;
            }

            if (found == null)
            {
                // Fallback to checking CurrentDirectory
                dir = new DirectoryInfo(Directory.GetCurrentDirectory());
                while (dir != null)
                {
                    var candidate = Path.Combine(dir.FullName, "rulesets");
                    if (Directory.Exists(candidate))
                    {
                        found = candidate;
                        break;
                    }
                    dir = dir.Parent;
                }
            }

            _rulesetDirectory = found ?? Path.Combine(Directory.GetCurrentDirectory(), "rulesets");
        }
    }

    public IReadOnlyList<string> GetAvailableVersions()
    {
        if (!Directory.Exists(_rulesetDirectory)) return [];

        return Directory.GetDirectories(_rulesetDirectory)
            .Select(Path.GetFileName)
            .Where(name => !string.IsNullOrEmpty(name))
            .Select(name => name!.StartsWith('v') || name!.StartsWith('V') ? name[1..] : name!)
            .OrderByDescending(v => v)
            .ToList();
    }

    public GameRuleset? GetRuleset(string version)
    {
        var normalizedVersion = version.TrimStart('v', 'V');

        lock (_lock)
        {
            if (_cache.TryGetValue(normalizedVersion, out var cached))
            {
                return cached;
            }

            var dir = Path.Combine(_rulesetDirectory, $"v{normalizedVersion}");
            if (!Directory.Exists(dir))
            {
                dir = Path.Combine(_rulesetDirectory, normalizedVersion);
                if (!Directory.Exists(dir)) return null;
            }

            var ruleset = LoadRulesetFromDirectory(dir, normalizedVersion);
            _cache[normalizedVersion] = ruleset;
            return ruleset;
        }
    }

    public GameRuleset GetLiveRuleset()
    {
        var versions = GetAvailableVersions();
        foreach (var v in versions)
        {
            var ruleset = GetRuleset(v);
            if (ruleset != null && ruleset.IsLive)
            {
                return ruleset;
            }
        }

        if (versions.Count > 0)
        {
            var fallback = GetRuleset(versions[0]);
            if (fallback != null) return fallback;
        }

        throw new InvalidOperationException($"No valid ruleset found in directory '{_rulesetDirectory}'.");
    }

    private static GameRuleset LoadRulesetFromDirectory(string dir, string version)
    {
        var ruleset = new GameRuleset { Version = version };

        var manifestPath = Path.Combine(dir, "manifest.json");
        if (File.Exists(manifestPath))
        {
            var manifestJson = File.ReadAllText(manifestPath);
            using var doc = JsonDocument.Parse(manifestJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("version", out var vProp)) ruleset.Version = vProp.GetString() ?? version;
            if (root.TryGetProperty("name", out var nProp)) ruleset.Name = nProp.GetString() ?? string.Empty;
            if (root.TryGetProperty("releaseDate", out var rProp)) ruleset.ReleaseDate = rProp.GetString() ?? string.Empty;
            if (root.TryGetProperty("isLive", out var lProp)) ruleset.IsLive = lProp.GetBoolean();
            if (root.TryGetProperty("config", out var cProp))
            {
                ruleset.Config = JsonSerializer.Deserialize<RulesetConfig>(cProp.GetRawText(), JsonOptions) ?? new();
            }
        }

        LoadIfExists<List<SpecialRuleDefinition>>(Path.Combine(dir, "special-rules.json"), data => ruleset.SpecialRules = data);
        LoadIfExists<List<AllegianceDefinition>>(Path.Combine(dir, "allegiances.json"), data => ruleset.Allegiances = data);
        LoadIfExists<List<FactionDefinition>>(Path.Combine(dir, "factions.json"), data => ruleset.Factions = data);
        LoadIfExists<List<MonsterProfileDefinition>>(Path.Combine(dir, "monsters.json"), data => ruleset.Monsters = data);
        LoadIfExists<AnimalDataDefinition>(Path.Combine(dir, "animals.json"), data => ruleset.Animals = data);
        LoadIfExists<List<EquipmentDefinition>>(Path.Combine(dir, "equipments.json"), data => ruleset.Equipments = data);
        LoadIfExists<List<EquipmentDefinition>>(Path.Combine(dir, "magic-items.json"), data => ruleset.MagicItems = data);
        LoadIfExists<List<SpellDefinition>>(Path.Combine(dir, "spells.json"), data => ruleset.Spells = data);
        LoadIfExists<List<SpecializationDefinition>>(Path.Combine(dir, "specializations.json"), data => ruleset.Specializations = data);

        return ruleset;
    }

    private static void LoadIfExists<T>(string filePath, Action<T> assignAction)
    {
        if (File.Exists(filePath))
        {
            var json = File.ReadAllText(filePath);
            var result = JsonSerializer.Deserialize<T>(json, JsonOptions);
            if (result != null) assignAction(result);
        }
    }
}
