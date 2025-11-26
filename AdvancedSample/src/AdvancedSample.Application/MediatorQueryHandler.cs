using AdvancedSample.Domain.Queries;
using MediatR;

namespace AdvancedSample.Application;

public sealed class MediatorQueryHandler : IRequestHandler<MediatorQuery, int>
{
    public Task<int> Handle(MediatorQuery request, CancellationToken cancellationToken) => Task.FromResult(2);
}