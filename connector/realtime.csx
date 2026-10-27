public class Script : ScriptBase
{
    private static readonly System.Text.RegularExpressions.Regex Allowed = new System.Text.RegularExpressions.Regex(@"^[a-z0-9][a-z0-9-]{0,62}\.(openai\.azure\.com|cognitiveservices\.azure\.com|services\.ai\.azure\.com|openai\.azure\.us|cognitiveservices\.azure\.us|openai\.azure\.cn)$");
    private void RouteToFoundry()
    {
        IEnumerable<string> v;
        if (!this.Context.Request.Headers.TryGetValues("x-foundry-host", out v)) throw new Exception("x-foundry-host header is required");
        var host = (v.FirstOrDefault() ?? "").Trim().ToLowerInvariant();
        if (!Allowed.IsMatch(host)) throw new Exception("x-foundry-host is not an allowed Azure AI Foundry hostname");
        this.Context.Request.Headers.Remove("x-foundry-host");
        var u = this.Context.Request.RequestUri;
        this.Context.Request.RequestUri = new Uri("https://" + host + u.PathAndQuery);
    }
    public override async Task<HttpResponseMessage> ExecuteAsync()
    {
        RouteToFoundry();
        return await this.Context.SendAsync(this.Context.Request, this.CancellationToken).ConfigureAwait(false);
    }
}
