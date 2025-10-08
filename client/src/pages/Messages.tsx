import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, MessageSquare } from "lucide-react";
import { Link, useParams } from "wouter";
import type { Message, Job, User } from "@shared/schema";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MessageWithSender extends Message {
  sender?: User;
}

interface JobWithUsers extends Job {
  poster?: User;
  claimer?: User;
}

export default function Messages() {
  const { jobId } = useParams();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: job } = useQuery<JobWithUsers>({
    queryKey: [`/api/jobs/${jobId}`],
    enabled: !!jobId,
  });

  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: [`/api/jobs/${jobId}/messages`],
    enabled: !!jobId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      const response = await apiRequest("POST", `/api/jobs/${jobId}/messages`, {
        jobId,
        senderId: user.id,
        content,
        isSystemMessage: false,
      });
      return response;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/messages`] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  const otherUser = user?.id === job?.posterId ? job?.claimer : job?.poster;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-card-foreground">Conversation not found</h2>
          <Link href="/">
            <Button className="mt-4 rounded-lg">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/jobs/${jobId}`}>
              <Button variant="ghost" size="icon" className="rounded-lg" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              {otherUser?.profileImageUrl ? (
                <img
                  src={otherUser.profileImageUrl}
                  alt={otherUser.firstName || 'User'}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {otherUser?.firstName?.[0] || otherUser?.email?.[0] || 'U'}
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {otherUser?.firstName} {otherUser?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {job.propertyAddress}
                </p>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 max-w-4xl mx-auto w-full">
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No messages yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Start the conversation by sending a message below
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isSender = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${message.id}`}
                >
                  <div className={`max-w-[70%] ${isSender ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`
                        rounded-lg p-3
                        ${isSender 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-muted text-muted-foreground rounded-bl-sm'
                        }
                      `}
                    >
                      {message.isSystemMessage ? (
                        <p className="text-xs italic">{message.content}</p>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      {new Date(message.createdAt!).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-border bg-card">
        <div className="max-w-4xl mx-auto p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg"
              data-testid="input-message"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-lg"
              data-testid="button-send"
              disabled={!messageText.trim() || sendMessageMutation.isPending}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
