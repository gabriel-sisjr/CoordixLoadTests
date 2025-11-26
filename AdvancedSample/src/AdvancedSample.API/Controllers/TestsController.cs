using AdvancedSample.Domain.Queries;
using IMediator = MediatR.IMediator;
using ICoordixMediator = Coordix.Interfaces.IMediator;
using Microsoft.AspNetCore.Mvc;
using Wolverine;

namespace AdvancedSample.API.Controllers;

[ApiController]
[Route("[controller]")]
public sealed class TestsController(IMediator mediatr, ICoordixMediator coordixMediator, IMessageBus wolverineBus) : ControllerBase
{
    [HttpGet("Coordix")]
    public async Task<IActionResult> Coordix(CancellationToken cancellationToken = default)
    {
        var coordixQuery = new CoordixQuery();
        var response = await coordixMediator.Send(coordixQuery, cancellationToken);

        return Ok(response);
    }

    [HttpGet("MediatR")]
    public async Task<IActionResult> MediatR(CancellationToken cancellationToken = default)
    {
        var mediatorQuery = new MediatorQuery();
        var response = await mediatr.Send(mediatorQuery, cancellationToken);

        return Ok(response);
    }

    [HttpGet("Wolverine")]
    public async Task<IActionResult> Wolverine(CancellationToken cancellationToken = default)
    {
        var wolverineQuery = new WolverineQuery();
        var response = await wolverineBus.InvokeAsync<int>(wolverineQuery, cancellationToken);

        return Ok(response);
    }
}
