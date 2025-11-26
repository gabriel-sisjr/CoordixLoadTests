using AdvancedSample.Domain.Queries;
using Coordix.Interfaces;

namespace AdvancedSample.Application;

public sealed class CoordixQueryHandler : IRequestHandler<CoordixQuery, int>
{
    public Task<int> Handle(CoordixQuery request, CancellationToken cancellationToken) => Task.FromResult(1);
}