using CtrWargameBuilder.Domain.Entities;
using CtrWargameBuilder.Domain.Models.Ruleset;
using CtrWargameBuilder.Domain.Validation;

namespace CtrWargameBuilder.Application.Interfaces;

public interface IWarbandValidator
{
    ValidationResult Validate(Warband warband, GameRuleset ruleset);
}
