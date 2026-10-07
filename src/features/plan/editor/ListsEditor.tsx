// Lists: the plan's checklists. Edit title, intro and groups (one item per line).
import { useState } from 'react';
import type { ChecklistDef } from '../../../data/checklists';
import { usePlan } from '../../../plan/resolve';
import { useStore } from '../../../store/store';
import { Icon } from '../../../ui/Icon';
import { Empty, Field } from '../../../ui/kit';
import { EditRow, RemoveButton, SheetActions, editPlan } from './common';
import { groupsFromDrafts, newListId, type GroupDraft } from './helpers';

const itemCount = (l: ChecklistDef) => l.groups.reduce((n, g) => n + g.items.length, 0);

export function ListsEditor() {
  const plan = usePlan();
  const lists = plan.checklists;
  const open = (list: ChecklistDef | null) =>
    useStore.getState().openSheet(list ? 'Edit list' : 'New list', () => <ListForm list={list} />);
  const remove = (id: string) =>
    editPlan((next) => {
      next.checklists = next.checklists.filter((l) => l.id !== id);
    }, 'List removed');

  return (
    <div className="stack">
      {lists.length === 0 ? (
        <div className="card">
          <Empty icon="list" title="No lists yet">Tap Add list to make a checklist, one item per line.</Empty>
        </div>
      ) : (
        <ul className="list pe-list">
          {lists.map((l) => {
            const n = itemCount(l);
            return (
              <EditRow
                key={l.id} title={l.title} editLabel={`Edit ${l.title}`} onEdit={() => open(l)}
                lead={<span className="pe-lead-ico" aria-hidden="true"><Icon name={l.icon || 'list'} size={18} /></span>}
                meta={<span className="num">{n} {n === 1 ? 'item' : 'items'}</span>}
              >
                <RemoveButton what={l.title} onConfirm={() => remove(l.id)} />
              </EditRow>
            );
          })}
        </ul>
      )}
      <button type="button" className="btn btn-block pe-add" onClick={() => open(null)}>
        <Icon name="plus" /> Add list
      </button>
    </div>
  );
}

function ListForm({ list }: { list: ChecklistDef | null }) {
  const close = useStore((s) => s.closeSheet);
  const [title, setTitle] = useState(list?.title ?? '');
  const [intro, setIntro] = useState(list?.intro ?? '');
  const [groups, setGroups] = useState<GroupDraft[]>(
    list && list.groups.length
      ? list.groups.map((g) => ({ title: g.title, text: g.items.map((i) => i.text).join('\n') }))
      : [{ title: '', text: '' }],
  );
  const setGroup = (i: number, patch: Partial<GroupDraft>) => setGroups(groups.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const clean = title.trim();
  const built = groupsFromDrafts(groups, list?.groups ?? []);
  const canSave = !!clean && built.length > 0;

  const save = () => {
    if (!canSave) return;
    editPlan((next) => {
      if (list) {
        const i = next.checklists.findIndex((l) => l.id === list.id);
        if (i < 0) return false;
        next.checklists[i] = { ...next.checklists[i], title: clean, intro: intro.trim(), groups: groupsFromDrafts(groups, next.checklists[i].groups) };
      } else {
        next.checklists = [...next.checklists, { id: newListId(), title: clean, icon: 'list', intro: intro.trim(), groups: built }];
      }
    }, list ? undefined : 'List added');
    close();
  };

  return (
    <div className="stack pe-form">
      <Field label="Title">
        <input id="pe-list-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60}
          placeholder="For example: Shoot day bag" autoFocus={!list} />
      </Field>
      <Field label="Intro">
        <input id="pe-list-intro" className="input" value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={160}
          placeholder="One line on when to use this list" />
      </Field>
      {groups.map((g, i) => (
        <fieldset key={i} className="pe-group">
          <legend className="label">Group {i + 1}</legend>
          <div className="row">
            <input id={`pe-group-title-${i}`} className="input grow" value={g.title} aria-label={`Group ${i + 1} title`}
              onChange={(e) => setGroup(i, { title: e.target.value })} maxLength={40} placeholder="Group title" />
            {groups.length > 1 && (
              <button type="button" className="pe-icon-btn" aria-label={`Remove group ${i + 1}`}
                onClick={() => setGroups(groups.filter((_, j) => j !== i))}>
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
          <textarea id={`pe-group-items-${i}`} className="input pe-textarea" rows={4} value={g.text} aria-label={`Group ${i + 1} items, one per line`}
            onChange={(e) => setGroup(i, { text: e.target.value })} placeholder="One item per line" />
        </fieldset>
      ))}
      <button type="button" className="btn btn-ghost pe-add-group" onClick={() => setGroups([...groups, { title: '', text: '' }])}>
        <Icon name="plus" /> Add group
      </button>
      {!canSave && <p className="small muted pe-hint">Add a title and at least one item to save.</p>}
      <SheetActions onSave={save} onCancel={close} saveLabel={list ? 'Save' : 'Add list'} disabled={!canSave} />
    </div>
  );
}
