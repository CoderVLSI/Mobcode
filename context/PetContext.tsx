import React, { createContext, useContext, useState, useCallback } from 'react';
import { Pet, PetAnimation, BUILT_IN_PETS, DEFAULT_PET_ID } from '../data/pets';

export type AgentStatus = 'idle' | 'running' | 'waiting' | 'review' | 'failed' | 'completed';

interface PetContextType {
  activePet: Pet;
  isVisible: boolean;
  animation: PetAnimation;
  agentStatus: AgentStatus;
  allPets: Pet[];
  setActivePet: (petId: string) => void;
  toggleVisibility: () => void;
  showPet: () => void;
  hidePet: () => void;
  setAgentStatus: (status: AgentStatus) => void;
}

const PetContext = createContext<PetContextType>({
  activePet: BUILT_IN_PETS[0],
  isVisible: false,
  animation: 'idle',
  agentStatus: 'idle',
  allPets: BUILT_IN_PETS,
  setActivePet: () => {},
  toggleVisibility: () => {},
  showPet: () => {},
  hidePet: () => {},
  setAgentStatus: () => {},
});

export const usePet = () => useContext(PetContext);

// Maps agent status to the corresponding pet animation
const STATUS_TO_ANIMATION: Record<AgentStatus, PetAnimation> = {
  idle: 'idle',
  running: 'running',
  waiting: 'waiting',
  review: 'review',
  failed: 'failed',
  completed: 'jumping',
};

export function PetProvider({ children }: { children: React.ReactNode }) {
  const [activePetId, setActivePetId] = useState(DEFAULT_PET_ID);
  const [isVisible, setIsVisible] = useState(false);
  const [agentStatus, setAgentStatusState] = useState<AgentStatus>('idle');

  const activePet = BUILT_IN_PETS.find(p => p.id === activePetId) ?? BUILT_IN_PETS[0];
  const animation = STATUS_TO_ANIMATION[agentStatus];

  const setActivePet = useCallback((petId: string) => {
    if (BUILT_IN_PETS.find(p => p.id === petId)) {
      setActivePetId(petId);
    }
  }, []);

  const toggleVisibility = useCallback(() => setIsVisible(v => !v), []);
  const showPet = useCallback(() => setIsVisible(true), []);
  const hidePet = useCallback(() => setIsVisible(false), []);

  const setAgentStatus = useCallback((status: AgentStatus) => {
    setAgentStatusState(status);
  }, []);

  return (
    <PetContext.Provider value={{
      activePet,
      isVisible,
      animation,
      agentStatus,
      allPets: BUILT_IN_PETS,
      setActivePet,
      toggleVisibility,
      showPet,
      hidePet,
      setAgentStatus,
    }}>
      {children}
    </PetContext.Provider>
  );
}
