using MediatR;

namespace AdvancedSample.Domain.Queries;

public sealed record MediatorQuery : IRequest<int>;