$base = "http://localhost:8081/api/v1"
function Measure-Endpoint($name, $method="GET", $path, $body=$null) {
  $t0 = Get-Date
  try {
    $p = @{ Uri = "$base$path"; Method = $method; ContentType = "application/json"; TimeoutSec = 25 }
    if ($body) { $p.Body = $body }
    $r = Invoke-WebRequest @p -UseBasicParsing
    $ms = [int]((Get-Date) - $t0).TotalMilliseconds
    Write-Output "$name : $($r.StatusCode) in ${ms}ms, $($r.RawContentLength) bytes"
  } catch {
    $ms = [int]((Get-Date) - $t0).TotalMilliseconds
    $code = -1
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    Write-Output "$name : HTTP $code after ${ms}ms -- $($_.Exception.Message)"
  }
}
Measure-Endpoint "GET /me (no token, expect 401)" "GET" "/me"
Measure-Endpoint "GET /problems" "GET" "/problems?page=1&per_page=10"
Measure-Endpoint "POST /auth/login (sai pass, expect 401)" "POST" "/auth/login" '{"email":"no@no.com","password":"Wrong123!"}'
Measure-Endpoint "POST /auth/forgot (mail ao)" "POST" "/auth/forgot" '{"email":"no@no.com"}'
