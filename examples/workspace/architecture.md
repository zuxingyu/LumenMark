# Service Deployment Notes

This sample confirms the primary LumenMark preview path: GitHub-flavored Markdown, formulas, diagrams, and copyable highlighted code.

## Capacity Planning

For request throughput we use:

$$
L = \lambda W
$$

| Environment | Target | Ready |
| --- | ---: | --- |
| Staging | 2 replicas | Yes |
| Production | 6 replicas | Pending |

## Deployment Flow

```mermaid
flowchart LR
  A[Code Commit] --> B[CI Pipeline]
  B --> C{Tests Pass?}
  C -->|Yes| D[Build Image] --> E[Deploy to Production]
  C -->|No| F[Fail Build]
```

## Configuration

```json
{
  "name": "lumen-api",
  "replicas": 6
}
```

```sql
select service, status
from deployments
where environment = 'production';
```

## Scripts

```shell
#!/usr/bin/env sh
curl --fail https://service.example.test/health
```

```python
import subprocess

def deploy(environment: str) -> None:
    subprocess.run(["deploy", environment], check=True)
```

```java
public final class HealthCheck {
  public boolean ready() {
    return true;
  }
}
```
