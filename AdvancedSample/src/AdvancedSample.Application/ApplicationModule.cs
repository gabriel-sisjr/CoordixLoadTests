using Microsoft.Extensions.DependencyInjection;

namespace AdvancedSample.Application;

public static class ApplicationModule
{
    public static IServiceCollection AddApplicationModule(this IServiceCollection services)
    {
        services.AddScoped<CoordixQueryHandler>();
        services.AddScoped<MediatorQueryHandler>();

        return services;
    }
}
