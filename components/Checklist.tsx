'use client';

import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

interface SortableItemProps {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
}

const SortableItem = ({ item, onToggle, onRemove, onTextChange }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 p-3 bg-white border rounded-xl transition-all ${
        isDragging ? 'shadow-xl border-amber-200 scale-[1.02]' : 'border-slate-100 hover:border-slate-200 shadow-sm'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 transition-colors"
      >
        <GripVertical size={16} />
      </button>

      <button
        onClick={() => onToggle(item.id)}
        className={`flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
          item.completed 
            ? 'bg-amber-500 border-amber-500 text-white' 
            : 'border-slate-200 hover:border-amber-500'
        }`}
      >
        {item.completed && <CheckCircle2 size={12} strokeWidth={3} />}
      </button>

      <input
        type="text"
        value={item.text}
        onChange={(e) => onTextChange(item.id, e.target.value)}
        placeholder="Descreva a tarefa..."
        className={`flex-grow bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-tight transition-all ${
          item.completed ? 'text-slate-400 line-through' : 'text-slate-700'
        }`}
      />

      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export default function Checklist({ items = [], onChange }: ChecklistProps) {
  const [newItemText, setNewItemText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onChange(arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: newItemText,
      completed: false
    };
    onChange([...items, newItem]);
    setNewItemText('');
  };

  const handleToggleItem = (id: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const handleRemoveItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const handleTextChange = (id: string, text: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, text } : item
    ));
  };

  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Progresso da Manutenção</h4>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
              {completedCount} de {items.length} tarefas concluídas
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-amber-600 font-mono">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
        />
      </div>

      {/* Add Item Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
          placeholder="Adicionar nova tarefa ao checklist..."
          className="flex-grow bg-slate-50 border-slate-200 rounded-xl text-sm font-bold uppercase tracking-tight focus:ring-amber-500 focus:border-amber-500"
        />
        <button
          onClick={handleAddItem}
          className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Sortable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <SortableItem
                    item={item}
                    onToggle={handleToggleItem}
                    onRemove={handleRemoveItem}
                    onTextChange={handleTextChange}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {items.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Nenhuma tarefa no checklist</p>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
