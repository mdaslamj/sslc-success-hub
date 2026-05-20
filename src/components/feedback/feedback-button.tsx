import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  submitFeedback,
  type FeedbackKind,
} from "@/lib/production/beta-feedback";
import { useFeatureFlag } from "@/hooks/use-feature-flag";

export function FeedbackButton() {
  const enabled = useFeatureFlag("beta_feedback");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");

  if (!enabled) return null;

  function handleSubmit() {
    if (!message.trim()) {
      toast.error("Please describe what happened.");
      return;
    }
    submitFeedback({ kind, message: message.trim(), contact: contact.trim() || undefined });
    setMessage("");
    setContact("");
    setOpen(false);
    toast.success("Thanks — your feedback was saved.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-20 right-4 z-40 shadow-md md:bottom-6"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share feedback</DialogTitle>
          <DialogDescription>
            Help us improve Aura. Reports stay private and are reviewed by the team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={kind} onValueChange={(v) => setKind(v as FeedbackKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="confusion">Confusion</SelectItem>
              <SelectItem value="praise">Praise</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="What happened? What did you expect?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />
          <Input
            placeholder="Email (optional, so we can reply)"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Send feedback</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}