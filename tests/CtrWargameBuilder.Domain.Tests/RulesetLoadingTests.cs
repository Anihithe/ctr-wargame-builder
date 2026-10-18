using CtrWargameBuilder.Infrastructure.Services;
using Xunit;

namespace CtrWargameBuilder.Domain.Tests;

public class RulesetLoadingTests
{
    [Fact]
    public void RulesetProvider_ShouldLoad_Version08_Successfully()
    {
        // Arrange
        var provider = new RulesetProvider();

        // Act
        var ruleset = provider.GetRuleset("0.8");

        // Assert
        Assert.NotNull(ruleset);
        Assert.Equal("0.8", ruleset.Version);
        Assert.True(ruleset.IsLive);
        Assert.Equal(10, ruleset.Config.DefaultStartingGold);
        Assert.Equal(10, ruleset.Config.MaxWarbandMembersStandard);

        // Factions
        Assert.Equal(8, ruleset.Factions.Count);
        Assert.Contains(ruleset.Factions, f => f.Id == "alliance");
        Assert.Contains(ruleset.Factions, f => f.Id == "excellence");
        Assert.Contains(ruleset.Factions, f => f.Id == "perfidie");
        Assert.Contains(ruleset.Factions, f => f.Id == "brutalite");
        Assert.Contains(ruleset.Factions, f => f.Id == "eternite");
        Assert.Contains(ruleset.Factions, f => f.Id == "tenacite");
        Assert.Contains(ruleset.Factions, f => f.Id == "mercenaires");
        Assert.Contains(ruleset.Factions, f => f.Id == "monstruosite");

        // Alliances
        Assert.Equal(9, ruleset.Allegiances.Count);

        // Equipments
        Assert.NotEmpty(ruleset.Equipments);
        Assert.NotEmpty(ruleset.MagicItems);

        // Spells & Specializations
        Assert.NotEmpty(ruleset.Spells);
        Assert.Equal(16, ruleset.Specializations.Count);
    }

    [Fact]
    public void RulesetProvider_ShouldResolve_LiveRuleset()
    {
        // Arrange
        var provider = new RulesetProvider();

        // Act
        var live = provider.GetLiveRuleset();

        // Assert
        Assert.NotNull(live);
        Assert.True(live.IsLive);
        Assert.Equal("0.8", live.Version);
    }
}
