import { createContext, useState, useContext, ReactNode } from 'react';
import { SelectableItem } from '@/types';

interface SelectionContextType {
  selectedItem: SelectableItem | null;
  setSelectedItem: (item: SelectableItem | null) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(null);

  return (
    <SelectionContext.Provider value={{ selectedItem, setSelectedItem }}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};