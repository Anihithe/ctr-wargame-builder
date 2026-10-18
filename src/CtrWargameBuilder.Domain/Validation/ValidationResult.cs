namespace CtrWargameBuilder.Domain.Validation;

public enum ValidationSeverity
{
    Error = 0,
    Warning = 1,
    Info = 2
}

public class ValidationMessage
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public ValidationSeverity Severity { get; set; } = ValidationSeverity.Error;
    public Guid? FighterId { get; set; }
}

public class ValidationResult
{
    public bool IsValid => Messages.All(m => m.Severity != ValidationSeverity.Error);
    public List<ValidationMessage> Messages { get; set; } = [];

    public void AddError(string code, string message, Guid? fighterId = null)
    {
        Messages.Add(new ValidationMessage
        {
            Code = code,
            Message = message,
            Severity = ValidationSeverity.Error,
            FighterId = fighterId
        });
    }

    public void AddWarning(string code, string message, Guid? fighterId = null)
    {
        Messages.Add(new ValidationMessage
        {
            Code = code,
            Message = message,
            Severity = ValidationSeverity.Warning,
            FighterId = fighterId
        });
    }

    public void AddInfo(string code, string message, Guid? fighterId = null)
    {
        Messages.Add(new ValidationMessage
        {
            Code = code,
            Message = message,
            Severity = ValidationSeverity.Info,
            FighterId = fighterId
        });
    }
}
