"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CalendarPlus,
  Download,
  Lock,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  Unlock,
  X
} from "lucide-react";
import { ChoiceToggle, Field, SelectField, TextInput } from "@/components/FormControls";
import { PlayersPanel } from "@/components/admin/PlayersPanel";
import { Button, Hero, StatCard, SyncBadge, cx } from "@/components/ui";
import { formatTimestamp, voiceCallSummary } from "@/lib/format";
import { ROSTER_CONFIG, allHeroOptions, type EventType, type JoinHeroOption } from "@/lib/rosterConfig";
import type { AdminSortKey, ParticipationEntry, ParticipationForm, Player, RosterEvent } from "@/lib/rosterTypes";
import { toggleHeroSelection, validateForm } from "@/lib/rosterValidation";

type Message = {
  type: "error" | "success";
  text: string;
} | null;

type SortDirection = "asc" | "desc";

type RosterAdminData = {
  events: RosterEvent[];
  players: Player[];
  participationEntries: ParticipationEntry[];
};

type SubmittedFilter = "all" | "submitted" | "not_submitted";

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
};

export function RosterAdminDashboard() {
  const [pin, setPin] = useState("");
  const [events, setEvents] = useState<RosterEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [entries, setEntries] = useState<ParticipationEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [allianceFilter, setAllianceFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [fcFilter, setFcFilter] = useState("all");
  const [heliosFilter, setHeliosFilter] = useState("all");
  const [heroFilter, setHeroFilter] = useState("all");
  const [voiceCallFilter, setVoiceCallFilter] = useState("all");
  const [submittedFilter, setSubmittedFilter] = useState<SubmittedFilter>("submitted");
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey] = useState<AdminSortKey>("submittedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ParticipationForm | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [playerEdit, setPlayerEdit] = useState<{ playerGameId: string; playerName: string; alliance: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const activeEvents = events.filter((event) => event.status !== "archived");
  const pastEvents = events.filter((event) => event.status === "archived");
  const openEvents = events.filter((event) => event.status === "open");
  const failedSyncs = entries.filter((entry) => entry.sheetSyncStatus === "sheet_sync_failed").length;

  const concreteEventFilter = eventFilter !== "all" ? eventFilter : "";
  const playersWithoutEntry = useMemo(() => {
    if (submittedFilter !== "not_submitted" || !concreteEventFilter) return [];
    const submittedPlayerIds = new Set(entries.filter((entry) => entry.event.id === concreteEventFilter).map((entry) => entry.player.id));
    return players.filter((player) => !submittedPlayerIds.has(player.id));
  }, [concreteEventFilter, entries, players, submittedFilter]);

  const filteredEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (submittedFilter === "not_submitted") return [];

    return entries
      .filter((entry) => {
        const haystack = `${entry.player.playerName} ${entry.player.playerId}`.toLowerCase();
        const searchOk = !needle || haystack.includes(needle);
        const eventTypeOk = eventTypeFilter === "all" || entry.event.eventType === eventTypeFilter;
        const eventOk = eventFilter === "all" || entry.event.id === eventFilter;
        const archivedOk = showArchived || entry.event.status !== "archived";
        const allianceOk = allianceFilter === "all" || entry.player.alliance === allianceFilter;
        const availabilityOk = availabilityFilter === "all" || entry.availability === availabilityFilter;
        const fcOk =
          fcFilter === "all" ||
          entry.infantryFcLevel === fcFilter ||
          entry.lancerFcLevel === fcFilter ||
          entry.marksmenFcLevel === fcFilter;
        const heliosOk =
          heliosFilter === "all" ||
          (heliosFilter === "yes" && (entry.infantryHelios || entry.lancerHelios || entry.marksmenHelios)) ||
          (heliosFilter === "no" && !entry.infantryHelios && !entry.lancerHelios && !entry.marksmenHelios);
        const heroOk = heroFilter === "all" || entry.joinHeroes.includes(heroFilter as JoinHeroOption);
        const voiceCallOk =
          voiceCallFilter === "all" ||
          (voiceCallFilter === "yes" && entry.joinVoiceCall === true) ||
          (voiceCallFilter === "no" && entry.joinVoiceCall === false) ||
          (voiceCallFilter === "not_provided" && entry.joinVoiceCall === null);
        return searchOk && eventTypeOk && eventOk && archivedOk && allianceOk && availabilityOk && fcOk && heliosOk && heroOk && voiceCallOk;
      })
      .sort((a, b) => compareEntries(a, b, sortKey, sortDirection));
  }, [
    allianceFilter,
    availabilityFilter,
    entries,
    eventFilter,
    eventTypeFilter,
    fcFilter,
    heroFilter,
    heliosFilter,
    voiceCallFilter,
    search,
    showArchived,
    sortDirection,
    sortKey,
    submittedFilter
  ]);

  function setAdminData(data: RosterAdminData) {
    setEvents(data.events);
    setPlayers(data.players);
    setEntries(data.participationEntries);
  }

  async function loadAdmin() {
    if (!pin.trim()) {
      setMessage({ type: "error", text: "Enter the admin PIN." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const body = await postJson<RosterAdminData>("/api/admin/roster", { pin });
      setAdminData(body);
      setLoaded(true);
      setMessage({ type: "success", text: "Roster data loaded." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to load roster data." });
    } finally {
      setLoading(false);
    }
  }

  async function startEvent(eventType: EventType) {
    await runMutation("/api/admin/event/start", { eventType }, `${eventType} event created.`);
  }

  async function openEvent(event: RosterEvent, lockExisting = false) {
    await runMutation(
      "/api/admin/event/open",
      { eventId: event.id, lockExisting },
      `${event.name} opened.`,
      async (error) => {
        const conflict = error.conflict as { openEvent?: RosterEvent } | undefined;

        if (
          conflict?.openEvent &&
          window.confirm(
            `${conflict.openEvent.name} is already open. Lock it and open ${event.name}?`
          )
        ) {
          await openEvent(event, true);
        }
      }
    );
  }

  async function closeEvent(event: RosterEvent) {
    if (!window.confirm(`Close public participation for ${event.name}?`)) return;
    await runMutation("/api/admin/event/close", { eventId: event.id }, `${event.name} closed.`);
  }

  async function lockEvent(event: RosterEvent) {
    if (!window.confirm(`Lock ${event.name}? Public participation will close, but admin edits remain available.`)) return;
    await runMutation("/api/admin/event/lock", { eventId: event.id }, `${event.name} locked.`);
  }

  async function archiveEvent(event: RosterEvent) {
    if (!window.confirm(`Archive ${event.name}? It will move to Past Events.`)) return;
    await runMutation("/api/admin/event/archive", { eventId: event.id }, `${event.name} archived.`);
  }

  async function restoreEvent(event: RosterEvent) {
    await runMutation("/api/admin/event/restore", { eventId: event.id }, `${event.name} restored.`);
  }

  async function retrySync(entry: ParticipationEntry) {
    await runMutation("/api/admin/retry-sync", { participationEntryId: entry.id }, "Google Sheets sync retried.");
  }

  function requestDeleteEntry(entry: ParticipationEntry) {
    setConfirmDialog({
      title: "Delete Submission",
      message: "Delete this submission? This cannot be undone.",
      confirmLabel: "Delete Submission",
      onConfirm: async () => {
        await runMutation("/api/admin/participation/delete", { participationEntryId: entry.id }, "Participation deleted.");
      }
    });
  }

  function requestDeletePlayer(player: Player) {
    const participationCount = entries.filter((entry) => entry.player.id === player.id).length;

    if (participationCount > 0) {
      setMessage({
        type: "error",
        text: `${player.playerName} has ${participationCount} participation entr${participationCount === 1 ? "y" : "ies"}. Delete those entries before deleting the player.`
      });
      return;
    }

    setConfirmDialog({
      title: "Delete Player",
      message: "Delete this player? This cannot be undone.",
      confirmLabel: "Delete Player",
      onConfirm: async () => {
        await runMutation("/api/admin/player/delete", { playerUuid: player.id }, "Player deleted.");
      }
    });
  }

  async function confirmDelete() {
    if (!confirmDialog) return;
    await confirmDialog.onConfirm();
    setConfirmDialog(null);
  }

  async function runMutation(
    url: string,
    body: Record<string, unknown>,
    successText: string,
    onError?: (error: { message: string; conflict?: unknown }) => Promise<void>
  ) {
    setLoading(true);
    setMessage(null);

    try {
      const result = await postJson<RosterAdminData>(url, { pin, ...body });
      setAdminData(result);
      setMessage({ type: "success", text: successText });
    } catch (error) {
      const payload = error instanceof ApiError ? error.payload : { message: error instanceof Error ? error.message : "Request failed." };

      if (onError && payload.conflict) {
        await onError(payload);
      } else {
        setMessage({ type: "error", text: payload.message });
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveEntryEdit() {
    if (!editingEntryId || !editForm) return;

    const validation = validateForm(editForm);
    setEditErrors({});
    setMessage(null);

    if (!validation.ok) {
      setEditErrors(validation.fieldErrors);
      setMessage({ type: "error", text: Object.values(validation.fieldErrors)[0] || "Review the edited participation." });
      return;
    }

    setLoading(true);

    try {
      const result = await postJson<RosterAdminData>("/api/admin/participation/update", {
        pin,
        participationEntryId: editingEntryId,
        participation: validation.data
      });
      setAdminData(result);
      setEditingEntryId(null);
      setEditForm(null);
      setEditErrors({});
      setMessage({ type: "success", text: "Participation updated." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to update participation." });
    } finally {
      setLoading(false);
    }
  }

  async function savePlayerEdit() {
    if (!editingPlayerId || !playerEdit) return;

    setLoading(true);
    setMessage(null);

    try {
      const result = await postJson<RosterAdminData>("/api/admin/player/update", {
        pin,
        playerUuid: editingPlayerId,
        player: playerEdit
      });
      setAdminData(result);
      setEditingPlayerId(null);
      setPlayerEdit(null);
      setMessage({ type: "success", text: "Player updated." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to update player." });
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv(exportType: "players" | "participation") {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, exportType })
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || "CSV export failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `1474-event-roster-${exportType}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "CSV exported." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "CSV export failed." });
    } finally {
      setLoading(false);
    }
  }

  function startEntryEdit(entry: ParticipationEntry) {
    setEditingEntryId(entry.id);
    setEditForm(formFromEntry(entry));
    setEditErrors({});
  }

  function updateEdit<K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) {
    setEditForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function startPlayerEdit(player: Player) {
    setEditingPlayerId(player.id);
    setPlayerEdit({
      playerGameId: player.playerId,
      playerName: player.playerName,
      alliance: player.alliance
    });
  }

  function cancelPlayerEdit() {
    setEditingPlayerId(null);
    setPlayerEdit(null);
  }

  function updatePlayerEdit(edit: { playerGameId: string; playerName: string; alliance: string }) {
    setPlayerEdit(edit);
  }

  function changeSort(nextKey: AdminSortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  return (
    <main className="app-shell wide">
      <Hero title={ROSTER_CONFIG.appName} subtitle="Manage 1474 players, active events, participation entries, and reporting sync." />

      {message && <div className={`message ${message.type}`}>{message.text}</div>}
      {confirmDialog && (
        <ConfirmDialog
          confirmLabel={confirmDialog.confirmLabel}
          loading={loading}
          message={confirmDialog.message}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={confirmDelete}
          title={confirmDialog.title}
        />
      )}

      {!loaded ? (
        <section className="panel login-panel">
          <Field label="Admin PIN">
            <TextInput
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void loadAdmin()}
            />
          </Field>
          <Button variant="primary" onClick={loadAdmin} disabled={loading}>
            <ShieldCheck aria-hidden="true" />
            {loading ? "Loading" : "Open Admin"}
          </Button>
        </section>
      ) : (
        <>
          <section className="panel event-panel">
            <div>
              <span className="eyebrow-text">Event Controls</span>
              <strong>Active Events</strong>
              <p>Only one event can be open to public participation at a time.</p>
            </div>
            <div className="event-actions">
              <Button variant="primary" onClick={() => startEvent("SVS")} disabled={loading}>
                <CalendarPlus aria-hidden="true" />
                Start New SVS Event
              </Button>
              <Button variant="primary" onClick={() => startEvent("Frost Dragon Tyrant")} disabled={loading}>
                <CalendarPlus aria-hidden="true" />
                Start New Frost Dragon Tyrant Event
              </Button>
            </div>
          </section>

          <section className="summary-grid">
            <StatCard label="Players" value={players.length} />
            <StatCard label="Participation entries" value={entries.length} />
            <StatCard label="Open event" value={openEvents.length} tone="success" />
            <StatCard label="Archived events" value={pastEvents.length} />
            <StatCard label="Failed syncs" value={failedSyncs} tone={failedSyncs > 0 ? "warning" : "default"} />
          </section>

          <EventCards
            entries={entries}
            events={activeEvents}
            loading={loading}
            onArchive={archiveEvent}
            onClose={closeEvent}
            onLock={lockEvent}
            onOpen={openEvent}
          />

          {pastEvents.length > 0 && (
            <section className="panel event-history-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow-text">Past Events</span>
                  <h2>Archived Events</h2>
                </div>
              </div>
              <div className="event-history-list">
                {pastEvents.map((event) => (
                  <div className="event-history-item" key={event.id}>
                    <strong>{event.name}</strong>
                    <span>{event.archivedAt ? `Archived ${formatTimestamp(event.archivedAt)}` : "Archived"}</span>
                    <Button size="small" variant="secondary" onClick={() => restoreEvent(event)} disabled={loading}>
                      <Undo2 aria-hidden="true" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="panel filters-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow-text">Filters</span>
                <h2>Roster Controls</h2>
              </div>
              <div className="event-actions">
                <Button variant="secondary" onClick={loadAdmin} disabled={loading}>
                  <RefreshCw aria-hidden="true" />
                  Refresh
                </Button>
                <Button variant="secondary" onClick={() => exportCsv("players")} disabled={loading}>
                  <Download aria-hidden="true" />
                  Export Players
                </Button>
                <Button variant="primary" onClick={() => exportCsv("participation")} disabled={loading}>
                  <Download aria-hidden="true" />
                  Export Participation
                </Button>
              </div>
            </div>
            <div className="filters-grid">
              <Field label="Event Type">
                <SelectField
                  placeholder="All event types"
                  value={eventTypeFilter === "all" ? "" : eventTypeFilter}
                  options={ROSTER_CONFIG.eventTypes.map((eventType) => ({ value: eventType, label: eventType }))}
                  onChange={(event) => setEventTypeFilter(event.target.value || "all")}
                />
              </Field>
              <Field label="Event">
                <SelectField
                  placeholder="All events"
                  value={eventFilter === "all" ? "" : eventFilter}
                  options={events.map((event) => ({ value: event.id, label: `${event.name} (${event.status})` }))}
                  onChange={(event) => setEventFilter(event.target.value || "all")}
                />
              </Field>
              <label className="field field-inline-label">
                <span>Search</span>
                <span className="input-icon-wrap">
                  <Search aria-hidden="true" />
                  <input placeholder="Name or Player ID" value={search} onChange={(event) => setSearch(event.target.value)} />
                </span>
              </label>
              <Field label="Alliance">
                <SelectField
                  placeholder="All alliances"
                  value={allianceFilter === "all" ? "" : allianceFilter}
                  options={ROSTER_CONFIG.alliances.map((alliance) => ({ value: alliance, label: alliance }))}
                  onChange={(event) => setAllianceFilter(event.target.value || "all")}
                />
              </Field>
              <Field label="Availability">
                <SelectField
                  placeholder="All availability"
                  value={availabilityFilter === "all" ? "" : availabilityFilter}
                  options={ROSTER_CONFIG.availabilityOptions.map((option) => ({ value: option, label: option }))}
                  onChange={(event) => setAvailabilityFilter(event.target.value || "all")}
                />
              </Field>
              <Field label="Any FC Level">
                <SelectField
                  placeholder="All FC levels"
                  value={fcFilter === "all" ? "" : fcFilter}
                  options={ROSTER_CONFIG.fcLevels.map((level) => ({ value: level, label: level }))}
                  onChange={(event) => setFcFilter(event.target.value || "all")}
                />
              </Field>
              <Field label="Helios Capable">
                <SelectField
                  placeholder="All"
                  value={heliosFilter === "all" ? "" : heliosFilter}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" }
                  ]}
                  onChange={(event) => setHeliosFilter(event.target.value || "all")}
                />
              </Field>
              <Field label="Hero Ownership">
                <SelectField
                  placeholder="All heroes"
                  value={heroFilter === "all" ? "" : heroFilter}
                  options={allHeroOptions().map((hero) => ({ value: hero, label: hero }))}
                  onChange={(event) => setHeroFilter(event.target.value || "all")}
                />
              </Field>
              <Field label="Voice Call">
                <SelectField
                  placeholder="All"
                  value={voiceCallFilter === "all" ? "" : voiceCallFilter}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "not_provided", label: "Not Provided" }
                  ]}
                  onChange={(event) => setVoiceCallFilter(event.target.value || "all")}
                />
              </Field>
              <Field label="Submitted">
                <SelectField
                  placeholder="Submitted"
                  value={submittedFilter === "submitted" ? "" : submittedFilter}
                  options={[
                    { value: "all", label: "All entries" },
                    { value: "not_submitted", label: "Not submitted for selected event" }
                  ]}
                  onChange={(event) => setSubmittedFilter((event.target.value || "submitted") as SubmittedFilter)}
                />
              </Field>
              <label className={cx("check-card compact-check", showArchived && "selected")}>
                <input checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} type="checkbox" />
                <span>
                  <strong>Show archived</strong>
                  <small>Include archived events in participation lists.</small>
                </span>
              </label>
            </div>
          </section>

          <section className="panel admin-list-panel">
            <div className="table-toolbar">
              <h2>Participation</h2>
              <span>{submittedFilter === "not_submitted" ? playersWithoutEntry.length : filteredEntries.length} shown</span>
            </div>
            <div className="sort-row">
              {sortOptions.map((option) => (
                <Button key={option.key} size="small" variant={sortKey === option.key ? "primary" : "secondary"} onClick={() => changeSort(option.key)}>
                  {option.label}
                  {sortKey === option.key ? (sortDirection === "asc" ? " Asc" : " Desc") : ""}
                </Button>
              ))}
            </div>
            {submittedFilter === "not_submitted" ? (
              <NotSubmittedList players={playersWithoutEntry} selectedEvent={events.find((event) => event.id === concreteEventFilter) || null} />
            ) : (
              <ParticipationList
                editErrors={editErrors}
                editingEntryId={editingEntryId}
                editForm={editForm}
                entries={filteredEntries}
                loading={loading}
                onCancelEdit={() => {
                  setEditingEntryId(null);
                  setEditForm(null);
                  setEditErrors({});
                }}
                onRetrySync={retrySync}
                onSaveEdit={saveEntryEdit}
                onStartEdit={startEntryEdit}
                onRequestDelete={requestDeleteEntry}
                updateEdit={updateEdit}
              />
            )}
          </section>

          <PlayersPanel
            players={players}
            participationEntries={entries}
            loading={loading}
            editingPlayerId={editingPlayerId}
            playerEdit={playerEdit}
            onStartEdit={startPlayerEdit}
            onUpdateEdit={updatePlayerEdit}
            onSaveEdit={savePlayerEdit}
            onCancelEdit={cancelPlayerEdit}
            onRequestDelete={requestDeletePlayer}
          />
        </>
      )}
    </main>
  );
}

function EventCards({
  events,
  entries,
  loading,
  onOpen,
  onClose,
  onLock,
  onArchive
}: {
  events: RosterEvent[];
  entries: ParticipationEntry[];
  loading: boolean;
  onOpen: (event: RosterEvent) => void;
  onClose: (event: RosterEvent) => void;
  onLock: (event: RosterEvent) => void;
  onArchive: (event: RosterEvent) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow-text">Active Events</span>
          <h2>Event Cards</h2>
        </div>
      </div>
      <div className="submission-list">
        {events.length === 0 ? (
          <div className="empty">No active events yet. Start an SVS or Frost Dragon Tyrant event to begin.</div>
        ) : (
          events.map((event) => {
            const count = entries.filter((entry) => entry.event.id === event.id).length;

            return (
              <article className="submission-card" key={event.id}>
                <div className="submission-main">
                  <div>
                    <span className="event-mini">{event.eventType}</span>
                    <h3>{event.name}</h3>
                    <p>{event.googleSheetTabName}</p>
                  </div>
                  <div className="submission-badges">
                    <span className={cx("status-badge", event.status === "open" ? "ready" : event.status === "locked" ? "watch" : "blocked")}>
                      {event.status}
                    </span>
                  </div>
                </div>
                <div className="submission-grid">
                  <Info label="Participation" value={String(count)} />
                  <Info label="Created" value={formatTimestamp(event.createdAt)} />
                  <Info label="Opened" value={event.openedAt ? formatTimestamp(event.openedAt) : "Not opened"} />
                </div>
                <div className="assign-actions">
                  <Button size="small" variant="primary" onClick={() => onOpen(event)} disabled={loading || event.status === "open"}>
                    <Unlock aria-hidden="true" />
                    Open
                  </Button>
                  <Button size="small" variant="secondary" onClick={() => onClose(event)} disabled={loading || event.status !== "open"}>
                    <Lock aria-hidden="true" />
                    Close
                  </Button>
                  <Button size="small" variant="secondary" onClick={() => onLock(event)} disabled={loading || event.status === "locked"}>
                    <Lock aria-hidden="true" />
                    Lock
                  </Button>
                  <Button size="small" variant="danger" onClick={() => onArchive(event)} disabled={loading}>
                    <Archive aria-hidden="true" />
                    Archive
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function ParticipationList({
  entries,
  editingEntryId,
  editForm,
  editErrors,
  loading,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onRetrySync,
  onRequestDelete,
  updateEdit
}: {
  entries: ParticipationEntry[];
  editingEntryId: string | null;
  editForm: ParticipationForm | null;
  editErrors: Record<string, string>;
  loading: boolean;
  onStartEdit: (entry: ParticipationEntry) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRetrySync: (entry: ParticipationEntry) => void;
  onRequestDelete: (entry: ParticipationEntry) => void;
  updateEdit: <K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) => void;
}) {
  return (
    <div className="submission-list participation-list">
      {entries.length === 0 ? (
        <div className="empty">No participation entries match these filters.</div>
      ) : (
        entries.map((entry) => (
          <article className="submission-card participation-card" key={entry.id}>
            <div className="submission-main">
              <div>
                <span className="event-mini">{entry.event.name}</span>{" "}
                <span className={`alliance-badge ${entry.player.alliance.toLowerCase()}`}>{entry.player.alliance}</span>
                <h3>{entry.player.playerName}</h3>
                <p>{entry.player.playerId}</p>
              </div>
              <div className="submission-badges">
                <span className={cx("status-badge", entry.event.status === "open" ? "ready" : entry.event.status === "locked" ? "watch" : "blocked")}>
                  {entry.event.status}
                </span>
                <SyncBadge status={entry.sheetSyncStatus} />
              </div>
            </div>

            {editingEntryId === entry.id && editForm ? (
              <EditParticipationForm
                errors={editErrors}
                form={editForm}
                loading={loading}
                onCancel={onCancelEdit}
                onSave={onSaveEdit}
                update={updateEdit}
              />
            ) : (
              <>
                <div className="participation-entry-row">
                  <Info className="participation-kv-event-type" label="Event Type" value={entry.event.eventType} />
                  <Info label="Availability" value={entry.availability} />
                  <Info label="Infantry" value={troopSummary(entry.infantryFcLevel, entry.infantryHelios)} />
                  <Info label="Lancer" value={troopSummary(entry.lancerFcLevel, entry.lancerHelios)} />
                  <Info label="Marksmen" value={troopSummary(entry.marksmenFcLevel, entry.marksmenHelios)} />
                  <Info className="participation-kv-heroes" label="Rally / Defense Heroes" value={heroSummary(entry.joinHeroes)} />
                  <Info label="Voice Call" value={voiceCallSummary(entry.joinVoiceCall)} />
                  <div className="participation-entry-spacer" aria-hidden="true" />
                  <Info className="participation-kv-timestamp" {...entryTimestampInfo(entry)} />
                  <div className="participation-entry-actions">
                    <Button size="small" variant="secondary" onClick={() => onStartEdit(entry)} disabled={loading}>
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                    <Button size="small" variant="danger" onClick={() => onRequestDelete(entry)} disabled={loading}>
                      <Trash2 aria-hidden="true" />
                      Delete
                    </Button>
                    {entry.sheetSyncStatus === "sheet_sync_failed" && (
                      <Button size="small" variant="secondary" onClick={() => onRetrySync(entry)} disabled={loading}>
                        <RotateCcw aria-hidden="true" />
                        Retry sync
                      </Button>
                    )}
                  </div>
                </div>
                {entry.sheetError && <p className="hint">Sheets: {entry.sheetError}</p>}
              </>
            )}
          </article>
        ))
      )}
    </div>
  );
}

function EditParticipationForm({
  form,
  errors,
  loading,
  update,
  onSave,
  onCancel
}: {
  form: ParticipationForm;
  errors: Record<string, string>;
  loading: boolean;
  update: <K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  function toggleJoinHero(hero: JoinHeroOption) {
    update("joinHeroes", toggleHeroSelection(form.joinHeroes, hero));
  }

  return (
    <div className="step-stack">
      <div className="filters-grid">
        <Field label="Player Name" error={errors.playerName}>
          <TextInput value={form.playerName} onChange={(event) => update("playerName", event.target.value)} />
        </Field>
        <Field label="Player ID" error={errors.playerGameId}>
          <TextInput value={form.playerGameId} onChange={(event) => update("playerGameId", event.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Alliance" error={errors.alliance}>
          <SelectField
            placeholder="Choose alliance"
            value={form.alliance}
            options={ROSTER_CONFIG.alliances.map((alliance) => ({ value: alliance, label: alliance }))}
            onChange={(event) => update("alliance", event.target.value as ParticipationForm["alliance"])}
          />
        </Field>
        <Field label="Availability" error={errors.availability}>
          <SelectField
            placeholder="Choose availability"
            value={form.availability}
            options={ROSTER_CONFIG.availabilityOptions.map((option) => ({ value: option, label: option }))}
            onChange={(event) => update("availability", event.target.value as ParticipationForm["availability"])}
          />
        </Field>
      </div>

      <div className="troop-strength-grid">
        <EditTroopSection
          label="Infantry"
          fcField="infantryFcLevel"
          heliosField="infantryHelios"
          fcValue={form.infantryFcLevel}
          heliosValue={form.infantryHelios}
          error={errors.infantryFcLevel}
          update={update}
        />
        <EditTroopSection
          label="Lancer"
          fcField="lancerFcLevel"
          heliosField="lancerHelios"
          fcValue={form.lancerFcLevel}
          heliosValue={form.lancerHelios}
          error={errors.lancerFcLevel}
          update={update}
        />
        <EditTroopSection
          label="Marksmen"
          fcField="marksmenFcLevel"
          heliosField="marksmenHelios"
          fcValue={form.marksmenFcLevel}
          heliosValue={form.marksmenHelios}
          error={errors.marksmenFcLevel}
          update={update}
        />
      </div>

      <div className="field-block">
        <span className="field-label">Rally / Defense Heroes</span>
        <p className="hint">Select all heroes at 4★ with Level 5 Expedition Skill.</p>
        <div className="choice-grid compact-choice-grid">
          {ROSTER_CONFIG.joinHeroOptions.map((hero) => (
            <ChoiceToggle key={hero} selected={form.joinHeroes.includes(hero)} onClick={() => toggleJoinHero(hero)}>
              {hero}
            </ChoiceToggle>
          ))}
        </div>
        {errors.joinHeroes && <small className="field-error">{errors.joinHeroes}</small>}
      </div>

      <div className="field-block">
        <span className="field-label">Do you plan to join Voice Call?</span>
        <div className="choice-grid two compact-choice-grid">
          <ChoiceToggle selected={form.joinVoiceCall === true} onClick={() => update("joinVoiceCall", true)}>
            Yes
          </ChoiceToggle>
          <ChoiceToggle selected={form.joinVoiceCall === false} onClick={() => update("joinVoiceCall", false)}>
            No
          </ChoiceToggle>
        </div>
      </div>


      <div className="assign-actions">
        <Button size="small" variant="primary" onClick={onSave} disabled={loading}>
          <Save aria-hidden="true" />
          Save
        </Button>
        <Button size="small" variant="secondary" onClick={onCancel} disabled={loading}>
          <X aria-hidden="true" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

function EditTroopSection({
  label,
  fcField,
  heliosField,
  fcValue,
  heliosValue,
  error,
  update
}: {
  label: string;
  fcField: "infantryFcLevel" | "lancerFcLevel" | "marksmenFcLevel";
  heliosField: "infantryHelios" | "lancerHelios" | "marksmenHelios";
  fcValue: ParticipationForm[typeof fcField];
  heliosValue: boolean;
  error?: string;
  update: <K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) => void;
}) {
  return (
    <section className="troop-strength-card">
      <h3>{label}</h3>
      <Field label="FC Level" error={error}>
        <SelectField
          placeholder="Choose FC level"
          value={fcValue}
          options={ROSTER_CONFIG.fcLevels.map((level) => ({ value: level, label: level }))}
          onChange={(event) => update(fcField, event.target.value as ParticipationForm[typeof fcField])}
        />
      </Field>
      <div className="field-block">
        <span className="field-label">Helios?</span>
        <div className="choice-grid two compact-choice-grid">
          <ChoiceToggle selected={heliosValue} onClick={() => update(heliosField, true)}>
            Yes
          </ChoiceToggle>
          <ChoiceToggle selected={!heliosValue} onClick={() => update(heliosField, false)}>
            No
          </ChoiceToggle>
        </div>
      </div>
    </section>
  );
}

function NotSubmittedList({ players, selectedEvent }: { players: Player[]; selectedEvent: RosterEvent | null }) {
  return (
    <div className="submission-list">
      {!selectedEvent ? (
        <div className="empty">Choose a specific event to see players who have not submitted.</div>
      ) : players.length === 0 ? (
        <div className="empty">Every tracked player has submitted for {selectedEvent.name}.</div>
      ) : (
        players.map((player) => (
          <article className="submission-card" key={player.id}>
            <div className="submission-main">
              <div>
                <span className={`alliance-badge ${player.alliance.toLowerCase()}`}>{player.alliance}</span>
                <h3>{player.playerName}</h3>
                <p>{player.playerId}</p>
              </div>
              <span className="status-badge watch">Not submitted</span>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  loading,
  onCancel,
  onConfirm
}: {
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="confirm-modal" role="dialog" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div>
          <span className="eyebrow-text">Confirm</span>
          <h2 id="confirm-title">{title}</h2>
          <p id="confirm-message">{message}</p>
        </div>
        <div className="assign-actions">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            <Trash2 aria-hidden="true" />
            {loading ? "Deleting" : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

const sortOptions: Array<{ key: AdminSortKey; label: string }> = [
  { key: "submittedAt", label: "Submitted" },
  { key: "playerName", label: "Name" },
  { key: "playerGameId", label: "Player ID" },
  { key: "eventType", label: "Type" },
  { key: "eventName", label: "Event" },
  { key: "alliance", label: "Alliance" },
  { key: "availability", label: "Availability" },
  { key: "infantryFcLevel", label: "Infantry FC" },
  { key: "sheetSyncStatus", label: "Sync" }
];

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cx("mini-kv", className)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function entryTimestampInfo(entry: ParticipationEntry) {
  const editedMs = new Date(entry.editedAt).getTime();
  const submittedMs = new Date(entry.submittedAt).getTime();

  if (editedMs > submittedMs) {
    return { label: "Last Updated", value: formatTimestamp(entry.editedAt) };
  }

  return { label: "Submitted", value: formatTimestamp(entry.submittedAt) };
}

function formFromEntry(entry: ParticipationEntry): ParticipationForm {
  return {
    eventId: entry.event.id,
    playerName: entry.player.playerName,
    playerGameId: entry.player.playerId,
    alliance: entry.player.alliance,
    availability: entry.availability,
    infantryFcLevel: entry.infantryFcLevel,
    infantryHelios: entry.infantryHelios,
    lancerFcLevel: entry.lancerFcLevel,
    lancerHelios: entry.lancerHelios,
    marksmenFcLevel: entry.marksmenFcLevel,
    marksmenHelios: entry.marksmenHelios,
    joinHeroes: entry.joinHeroes,
    joinVoiceCall: entry.joinVoiceCall
  };
}

function troopSummary(fcLevel: string, helios: boolean) {
  return `${fcLevel} / Helios: ${helios ? "Yes" : "No"}`;
}

function heroSummary(heroes: readonly string[]) {
  return heroes.length > 0 ? heroes.join(", ") : "None";
}

function compareEntries(a: ParticipationEntry, b: ParticipationEntry, key: AdminSortKey, direction: SortDirection) {
  const left = valueForSort(a, key);
  const right = valueForSort(b, key);
  const result = key === "submittedAt" ? Number(left) - Number(right) : String(left).localeCompare(String(right));
  return direction === "asc" ? result : -result;
}

function valueForSort(entry: ParticipationEntry, key: AdminSortKey) {
  if (key === "submittedAt") return new Date(entry.submittedAt).getTime();
  if (key === "playerName") return entry.player.playerName;
  if (key === "playerGameId") return entry.player.playerId;
  if (key === "eventType") return entry.event.eventType;
  if (key === "eventName") return entry.event.name;
  if (key === "alliance") return entry.player.alliance;
  return entry[key];
}

class ApiError extends Error {
  payload: { message: string; conflict?: unknown };

  constructor(payload: { message: string; conflict?: unknown }) {
    super(payload.message);
    this.payload = payload;
  }
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new ApiError({ message: result.message || "Request failed.", conflict: result.conflict });
  }

  return result.data as T;
}
