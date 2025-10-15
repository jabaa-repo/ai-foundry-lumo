import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface ChecklistInputProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChecklistInput({ items, onChange, placeholder = "Add item...", disabled = false }: ChecklistInputProps) {
  const [newItemText, setNewItemText] = useState("");

  const addItem = () => {
    if (!newItemText.trim()) return;
    
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      checked: false,
    };
    
    onChange([...items, newItem]);
    setNewItemText("");
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const toggleItem = (id: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const updateItemText = (id: string, text: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, text } : item
    ));
  };

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 group">
          <Checkbox
            checked={item.checked}
            onCheckedChange={() => toggleItem(item.id)}
            disabled={disabled}
          />
          <Input
            value={item.text}
            onChange={(e) => updateItemText(item.id, e.target.value)}
            disabled={disabled}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeItem(item.id)}
            disabled={disabled}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addItem}
          disabled={disabled || !newItemText.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function checklistToString(items: ChecklistItem[]): string {
  return items.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n');
}

export function stringToChecklist(text: string): ChecklistItem[] {
  if (!text) return [];
  
  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const match = line.match(/^-\s*\[([ x])\]\s*(.+)$/i);
      if (match) {
        return {
          id: crypto.randomUUID(),
          text: match[2].trim(),
          checked: match[1].toLowerCase() === 'x',
        };
      }
      // Fallback for plain text lines
      return {
        id: crypto.randomUUID(),
        text: line.replace(/^-\s*/, '').trim(),
        checked: false,
      };
    });
}
