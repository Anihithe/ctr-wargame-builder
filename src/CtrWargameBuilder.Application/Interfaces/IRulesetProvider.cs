using CtrWargameBuilder.Domain.Models.Ruleset;

namespace CtrWargameBuilder.Application.Interfaces;

public interface IRulesetProvider
{
    IReadOnlyList<string> GetAvailableVersions();
    GameRuleset? GetRuleset(string version);
    GameRuleset GetLiveRuleset();
}
