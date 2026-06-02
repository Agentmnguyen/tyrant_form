"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Field, SelectField, TextInput } from "@/components/FormControls";
import { Button } from "@/components/ui";
import { formatTimestamp } from "@/lib/format";
import { DEFAULT_PLAYER_PAGE_SIZE, processPlayerList, type SortDirection } from "@/lib/playerList";
import { ROSTER_CONFIG } from "@/lib/rosterConfig";
import type { ParticipationEntry, Player, PlayerListFilters, PlayerSortKey } from "@/lib/rosterTypes";

type PlayerEditState = {
  playerGameId: string;
  playerName: string;
  alliance: string;
};

export type PlayersPanelProps = {
  players: Player[];
  participationEntries: ParticipationEntry[];
  loading: boolean;
  editingPlayerId: string | null;
  playerEdit: PlayerEditState | null;
  onStartEdit: (player: Player) => void;
  onUpdateEdit: (edit: PlayerEditState) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRequestDelete: (player: Player) => void;
};

const sortOptions: Array<{ key: PlayerSortKey; label: string; defaultDirection: SortDirection }> = [
  { key: "playerName", label: "Name A-Z", defaultDirection: "asc" },
  { key: "playerName", label: "Name Z-A", defaultDirection: "desc" },
  { key: "lastParticipationAt", label: "Most recently active", defaultDirection: "desc" },
  { key: "lastParticipationAt", label: "Oldest activity", defaultDirection: "asc" }
];

const defaultFilters: PlayerListFilters = {
  nameSearch: "",
  idSearch: "",
  alliance: "all"
};

export function PlayersPanel({
  players,
  participationEntries,
  loading,
  editingPlayerId,
  playerEdit,
  onStartEdit,
  onUpdateEdit,
  onSaveEdit,
  onCancelEdit,
  onRequestDelete
}: PlayersPanelProps) {
  const [filters, setFilters] = useState<PlayerListFilters>(defaultFilters);
  const [sortKey, setSortKey] = useState<PlayerSortKey>("playerName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filters.nameSearch, filters.idSearch, filters.alliance, sortKey, sortDirection]);

  const { paginated, filteredCount } = useMemo(
    () =>
      processPlayerList({
        players,
        entries: participationEntries,
        filters,
        sortKey,
        sortDirection,
        page,
        pageSize: DEFAULT_PLAYER_PAGE_SIZE
      }),
    [filters, page, participationEntries, players, sortDirection, sortKey]
  );

  function changeSort(nextKey: PlayerSortKey, nextDirection: SortDirection) {
    if (nextKey === sortKey && nextDirection === sortDirection) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextDirection);
  }

  function isSortActive(option: (typeof sortOptions)[number]) {
    return sortKey === option.key && sortDirection === option.defaultDirection;
  }

  return (
    <section className="panel admin-list-panel">
      <div className="table-toolbar">
        <h2>Players</h2>
        <span>{filteredCount} shown</span>
      </div>

      <div className="filters-grid players-filters">
        <Field label="Name Search">
          <TextInput
            placeholder="Search by player name"
            value={filters.nameSearch}
            onChange={(event) => setFilters((current) => ({ ...current, nameSearch: event.target.value }))}
          />
        </Field>
        <Field label="Player ID Search">
          <TextInput
            placeholder="Search by player ID"
            value={filters.idSearch}
            onChange={(event) => setFilters((current) => ({ ...current, idSearch: event.target.value }))}
          />
        </Field>
        <Field label="Alliance">
          <SelectField
            placeholder="All alliances"
            value={filters.alliance === "all" ? "" : filters.alliance}
            options={ROSTER_CONFIG.alliances.map((alliance) => ({ value: alliance, label: alliance }))}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                alliance: (event.target.value || "all") as PlayerListFilters["alliance"]
              }))
            }
          />
        </Field>
      </div>

      <div className="sort-row">
        {sortOptions.map((option, index) => (
          <Button
            key={`${option.key}-${option.defaultDirection}-${index}`}
            size="small"
            variant={isSortActive(option) ? "primary" : "secondary"}
            onClick={() => changeSort(option.key, option.defaultDirection)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="submission-list">
        {paginated.items.length === 0 ? (
          <div className="empty">No players match these filters.</div>
        ) : (
          paginated.items.map((player) => (
            <article className="submission-card" key={player.id}>
              {editingPlayerId === player.id && playerEdit ? (
                <div className="filters-grid">
                  <Field label="Player Name">
                    <TextInput
                      value={playerEdit.playerName}
                      onChange={(event) => onUpdateEdit({ ...playerEdit, playerName: event.target.value })}
                    />
                  </Field>
                  <Field label="Player ID">
                    <TextInput
                      value={playerEdit.playerGameId}
                      onChange={(event) => onUpdateEdit({ ...playerEdit, playerGameId: event.target.value })}
                    />
                  </Field>
                  <Field label="Alliance">
                    <SelectField
                      placeholder="Choose alliance"
                      value={playerEdit.alliance}
                      options={ROSTER_CONFIG.alliances.map((alliance) => ({ value: alliance, label: alliance }))}
                      onChange={(event) => onUpdateEdit({ ...playerEdit, alliance: event.target.value })}
                    />
                  </Field>
                  <div className="assign-actions">
                    <Button size="small" variant="primary" onClick={onSaveEdit} disabled={loading}>
                      <Save aria-hidden="true" />
                      Save
                    </Button>
                    <Button size="small" variant="secondary" onClick={onCancelEdit} disabled={loading}>
                      <X aria-hidden="true" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="submission-main">
                    <div>
                      <span className={`alliance-badge ${player.alliance.toLowerCase()}`}>{player.alliance}</span>
                      <h3>{player.playerName}</h3>
                      <p>{player.playerId}</p>
                    </div>
                    <Button size="small" variant="secondary" onClick={() => onStartEdit(player)} disabled={loading}>
                      <Pencil aria-hidden="true" />
                      Edit Player
                    </Button>
                    <Button size="small" variant="danger" onClick={() => onRequestDelete(player)} disabled={loading}>
                      <Trash2 aria-hidden="true" />
                      Delete Player
                    </Button>
                  </div>
                  <div className="submission-grid">
                    <Info label="Alliance" value={player.alliance} />
                    <Info
                      label="Last Participation"
                      value={player.lastParticipationAt ? formatTimestamp(player.lastParticipationAt) : "Never"}
                    />
                    <Info label="Participations" value={String(player.participationCount)} />
                  </div>
                </>
              )}
            </article>
          ))
        )}
      </div>

      {paginated.total > 0 && (
        <div className="pagination-row">
          <span>{paginated.rangeLabel}</span>
          <div className="assign-actions">
            <Button size="small" variant="secondary" onClick={() => setPage((current) => current - 1)} disabled={loading || paginated.page <= 1}>
              Previous
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => setPage((current) => current + 1)}
              disabled={loading || paginated.page >= paginated.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
