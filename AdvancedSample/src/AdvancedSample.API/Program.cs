using AdvancedSample.Application;
using Coordix.Extensions;
using JasperFx.CodeGeneration;
using Wolverine;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Dependency Injection of your project Modules.
builder.Services.AddApplicationModule();

// Registering Coordix
builder.Services.AddCoordix(typeof(ApplicationModule).Assembly);

// Registering MediatR
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(ApplicationModule).Assembly));

// Registering Wolverine
builder.Host.UseWolverine(opts =>
{
    opts.Durability.Mode = DurabilityMode.MediatorOnly;
    opts.CodeGeneration.TypeLoadMode = TypeLoadMode.Dynamic;
    opts.Discovery.IncludeAssembly(typeof(ApplicationModule).Assembly);
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();