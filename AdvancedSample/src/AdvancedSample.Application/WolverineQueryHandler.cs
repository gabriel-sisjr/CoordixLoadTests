using AdvancedSample.Domain.Queries;

namespace AdvancedSample.Application;

public sealed class WolverineQueryHandler
{
    public Task<int> Handle(WolverineQuery query) => Task.FromResult(3);
}
