import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { MessageCircle, Send, Phone, Users } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface Conversation {
  userId: string;
  firstName: string;
  lastName: string;
  lastMessage: string | null;
  lastAt: Date | null;
  unread: number;
}

interface AdminConversation {
  user1: Agent & { email?: string };
  user2: Agent & { email?: string };
  lastMessage: string | null;
  lastAt: Date | null;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}

export default function Chat() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [adminPair, setAdminPair] = useState<{ user1: string; user2: string } | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["dashboard-agents"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/agents");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const useAdminAll = isAdmin && !selectedUserId && !adminPair;
  const { data: myConversations = [] } = useQuery<Conversation[]>({
    queryKey: ["chat-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/chat/conversations");
      if (!res.ok) throw new Error("Eroare la încărcarea conversațiilor");
      return res.json();
    },
  });

  const { data: adminConversations = [] } = useQuery<AdminConversation[]>({
    queryKey: ["chat-admin-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/chat/conversations?all=1");
      if (!res.ok) throw new Error("Eroare la încărcarea conversațiilor");
      return res.json();
    },
    enabled: isAdmin && useAdminAll,
  });

  const otherUserId = selectedUserId || (adminPair ? adminPair.user1 : null);
  const loadUser1 = adminPair?.user1 ?? user?.id;
  const loadUser2 = adminPair?.user2 ?? otherUserId;
  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["chat-messages", loadUser1, loadUser2],
    queryFn: async () => {
      if (isAdmin && adminPair) {
        const res = await fetch(
          `/api/chat/messages?user1=${encodeURIComponent(adminPair.user1)}&user2=${encodeURIComponent(adminPair.user2)}`
        );
        if (!res.ok) throw new Error("Eroare la încărcarea mesajelor");
        return res.json();
      }
      if (!otherUserId) return [];
      const res = await fetch(`/api/chat/messages?withUserId=${encodeURIComponent(otherUserId)}`);
      if (!res.ok) throw new Error("Eroare la încărcarea mesajelor");
      return res.json();
    },
    enabled: Boolean(loadUser1 && loadUser2),
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: { recipientId: string; body: string }) => {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Eroare la trimitere");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-admin-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setMessageText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const body = messageText.trim();
    if (!body) return;
    const recipientId = isAdmin && adminPair
      ? (user?.id === adminPair.user1 ? adminPair.user2 : adminPair.user1)
      : selectedUserId;
    if (!recipientId) return;
    sendMutation.mutate({ recipientId, body });
  };

  const displayName = (u: { firstName: string; lastName: string }) =>
    `${u.firstName} ${u.lastName}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-8 w-8 text-[#fbbf24]" />
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Chat CRM</h1>
          <p className="text-sm text-slate-400">
            Mesaje între agenți {isAdmin && " – ca admin poți vedea toate conversațiile"}
          </p>
        </div>
      </div>

      <Card className="border-[#1f2937] bg-black/40 overflow-hidden">
        <div className="flex h-[calc(100vh-16rem)] min-h-[400px]">
          {/* Lista conversații / utilizatori */}
          <div className="w-72 border-r border-[#1f2937] flex flex-col">
            {isAdmin && (
              <div className="p-2 border-b border-[#1f2937]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId(null);
                    setAdminPair(null);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm",
                    !selectedUserId && !adminPair
                      ? "bg-[#fbbf24] text-black"
                      : "text-slate-300 hover:bg-[#1f2937]"
                  )}
                >
                  Toate conversațiile
                </button>
              </div>
            )}
            {isAdmin && !selectedUserId && (
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {adminConversations.length > 0 && (
                  <>
                    <p className="text-xs text-slate-500 px-2 py-1">Conversații între agenți</p>
                    {adminConversations.map((conv) => {
                  const key = [conv.user1.id, conv.user2.id].sort().join("-");
                  const isSelected =
                    adminPair &&
                    ((adminPair.user1 === conv.user1.id && adminPair.user2 === conv.user2.id) ||
                      (adminPair.user1 === conv.user2.id && adminPair.user2 === conv.user1.id));
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setAdminPair({ user1: conv.user1.id, user2: conv.user2.id })
                      }
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm",
                        isSelected ? "bg-[#fbbf24] text-black" : "text-slate-300 hover:bg-[#1f2937]"
                      )}
                    >
                      <div className="font-medium">
                        {displayName(conv.user1)} ↔ {displayName(conv.user2)}
                      </div>
                      {conv.lastMessage && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {conv.lastMessage}
                        </div>
                      )}
                    </button>
                  );
                })}
                  </>
                )}
                {agents.filter((a) => a.id !== user?.id).length > 0 && (
                  <>
                    <p className="text-xs text-slate-500 px-2 py-1 mt-2">Mesajează un agent</p>
                    {agents
                      .filter((a) => a.id !== user?.id)
                      .map((agent) => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(agent.id);
                            setAdminPair(null);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                            selectedUserId === agent.id ? "bg-[#fbbf24] text-black" : "text-slate-300 hover:bg-[#1f2937]"
                          )}
                        >
                          <Users className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {agent.firstName} {agent.lastName}
                          </span>
                          {myConversations.find((c) => c.userId === agent.id)?.unread ? (
                            <span className="ml-auto rounded-full bg-red-500 text-white text-xs px-1.5">
                              {myConversations.find((c) => c.userId === agent.id)?.unread}
                            </span>
                          ) : null}
                        </button>
                      ))}
                  </>
                )}
              </div>
            )}
            {(!isAdmin || selectedUserId || adminPair) && !useAdminAll && (
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {agents
                  .filter((a) => a.id !== user?.id)
                  .map((agent) => {
                    const isSelected = selectedUserId === agent.id && !adminPair;
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(agent.id);
                          setAdminPair(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                          isSelected ? "bg-[#fbbf24] text-black" : "text-slate-300 hover:bg-[#1f2937]"
                        )}
                      >
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {agent.firstName} {agent.lastName}
                        </span>
                        {myConversations.find((c) => c.userId === agent.id)?.unread ? (
                          <span className="ml-auto rounded-full bg-red-500 text-white text-xs px-1.5">
                            {myConversations.find((c) => c.userId === agent.id)?.unread}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Panoul de mesaje */}
          <div className="flex-1 flex flex-col min-w-0">
            {(!selectedUserId && !adminPair) && (
              <div className="flex-1 flex items-center justify-center text-slate-500 p-6">
                Selectează o conversație sau un utilizator din listă.
              </div>
            )}
            {(selectedUserId || adminPair) && (
              <>
                <CardHeader className="flex flex-row items-center justify-between border-b border-[#1f2937] py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {adminPair ? (
                      <>
                        {displayName(
                          agents.find((a) => a.id === adminPair.user1) || {
                            firstName: "",
                            lastName: "",
                          }
                        )}{" "}
                        ↔{" "}
                        {displayName(
                          agents.find((a) => a.id === adminPair.user2) || {
                            firstName: "",
                            lastName: "",
                          }
                        )}
                      </>
                    ) : (
                      (agents.find((a) => a.id === selectedUserId) && displayName(agents.find((a) => a.id === selectedUserId)!))
                    )}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#4b5563] text-slate-300 hover:bg-[#1f2937]"
                    onClick={() => {
                      const tel = (agents.find((a) => a.id === (selectedUserId || adminPair?.user2)) as { phone?: string })?.phone;
                      if (tel) window.location.href = `tel:${tel}`;
                      else toast.info("Apel: adaugă număr de telefon în profilul utilizatorului pentru apel direct.");
                    }}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Sună
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
                  <div className="flex-1 space-y-3">
                    {messages.map((m) => {
                      const isMe = m.senderId === user?.id;
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex",
                            isMe ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                              isMe
                                ? "bg-[#fbbf24] text-black"
                                : "bg-[#1f2937] text-slate-200"
                            )}
                          >
                            <div>{m.body}</div>
                            <div
                              className={cn(
                                "text-xs mt-1",
                                isMe ? "text-black/70" : "text-slate-500"
                              )}
                            >
                              {format(new Date(m.createdAt), "dd.MM.yyyy HH:mm", { locale: ro })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  {!adminPair && (
                    <div className="flex gap-2 pt-2 border-t border-[#1f2937]">
                      <Input
                        placeholder="Scrie un mesaj..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        className="bg-[#111827] border-[#4b5563] text-slate-100"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!messageText.trim() || sendMutation.isPending}
                        className="bg-[#fbbf24] text-black hover:bg-[#f59e0b]"
                      >
                        {sendMutation.isPending ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  {adminPair && (
                    <p className="text-xs text-slate-500 pt-2">
                      Ca admin vizualizezi conversația. Pentru a trimite mesaje, deschide conversația cu un singur utilizator din listă.
                    </p>
                  )}
                </CardContent>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

