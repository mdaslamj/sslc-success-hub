import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getAllFlagValues,
  setFeatureOverride,
  type FeatureFlag,
} from "@/lib/production/feature-flags";
import { notifyFlagsChanged } from "@/hooks/use-feature-flag";
import {
  summarizeFunnel,
  summarizeFeatureUsage,
  summarizeStudyMinutes,
  summarizeScanSuccessRate,
  clearProductEvents,
} from "@/lib/production/product-analytics";
import { snapshotDiagnostics } from "@/lib/production/diagnostics";
import {
  getBudgetSnapshot,
  resetBudget,
} from "@/lib/production/cost-governance";
import { listFeedback, deleteFeedback } from "@/lib/production/beta-feedback";
import { listDeletionRequests, markDeletionStatus } from "@/lib/production/account-lifecycle";
import { getEnvConfig } from "@/lib/production/env-config";

export function AdminOpsPanel() {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    const id = window.setInterval(refresh, 5000);
    return () => window.clearInterval(id);
  }, []);

  const env = getEnvConfig();
  const flags = getAllFlagValues();
  const funnel = summarizeFunnel();
  const features = summarizeFeatureUsage().slice(0, 8);
  const studyMin = summarizeStudyMinutes();
  const scans = summarizeScanSuccessRate();
  const diag = snapshotDiagnostics();
  const budget = getBudgetSnapshot();
  const feedback = listFeedback().slice(0, 10);
  const deletions = listDeletionRequests();

  void tick;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Environment</CardTitle>
          <Badge variant="outline">{env.env}</Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div>Release: <span className="text-foreground">{env.release}</span></div>
          <div>AI sample: <span className="text-foreground">{Math.round(env.analyticsSampleRate * 100)}%</span></div>
          <div>Daily token cap: <span className="text-foreground">{env.aiBudget.dailyTokenLimit.toLocaleString()}</span></div>
          <div>Per-request cap: <span className="text-foreground">{env.aiBudget.perRequestTokenCap.toLocaleString()}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">AI cost governance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={budget.percent} />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{budget.tokensUsed.toLocaleString()} / {budget.tokensLimit.toLocaleString()} tokens</span>
            <span>{budget.requests} requests</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => { resetBudget(); refresh(); }}>
            Reset daily budget
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feature flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.map(({ flag, value, overridden }) => (
            <div key={flag} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{flag}</div>
                {overridden && (
                  <div className="text-xs text-muted-foreground">overridden locally</div>
                )}
              </div>
              <Switch
                checked={value}
                onCheckedChange={(v) => {
                  setFeatureOverride(flag as FeatureFlag, v);
                  notifyFlagsChanged();
                  refresh();
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Product analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div>Study minutes: <span className="text-foreground">{studyMin}</span></div>
            <div>Scans: <span className="text-foreground">{scans.success}/{scans.total}</span></div>
          </div>
          <div>
            <div className="mb-1 font-medium">Funnel</div>
            <div className="space-y-1 text-muted-foreground">
              {Object.entries(funnel).length === 0 && <div>No events yet.</div>}
              {Object.entries(funnel).map(([step, count]) => (
                <div key={step} className="flex justify-between">
                  <span>{step}</span>
                  <span className="text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 font-medium">Top features</div>
            <div className="space-y-1 text-muted-foreground">
              {features.length === 0 && <div>No usage yet.</div>}
              {features.map((f) => (
                <div key={f.feature} className="flex justify-between">
                  <span>{f.feature}</span>
                  <span className="text-foreground">{f.count}</span>
                </div>
              ))}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => { clearProductEvents(); refresh(); }}>
            Clear analytics buffer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div>Crashes: <span className="text-foreground">{diag.crashes.length}</span></div>
          <div>AI errors: <span className="text-foreground">{diag.aiErrors.length}</span></div>
          <div>OCR failures: <span className="text-foreground">{diag.ocrFailures.length}</span></div>
          <div>Sync failures: <span className="text-foreground">{diag.syncFailures.length}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Beta feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {feedback.length === 0 && (
            <div className="text-sm text-muted-foreground">No feedback yet.</div>
          )}
          {feedback.map((f) => (
            <div key={f.id} className="rounded-md border p-2 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{f.kind}</Badge>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { deleteFeedback(f.id); refresh(); }}
                >
                  delete
                </button>
              </div>
              <div className="mt-1 whitespace-pre-wrap">{f.message}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {f.route} • {new Date(f.at).toLocaleString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account deletion queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {deletions.length === 0 && (
            <div className="text-sm text-muted-foreground">No pending requests.</div>
          )}
          {deletions.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="min-w-0">
                <div className="truncate">{d.email ?? d.uid}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(d.requestedAt).toLocaleString()} • {d.status}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => { markDeletionStatus(d.id, "in_progress"); refresh(); }}>
                  Start
                </Button>
                <Button size="sm" onClick={() => { markDeletionStatus(d.id, "completed"); refresh(); }}>
                  Done
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}