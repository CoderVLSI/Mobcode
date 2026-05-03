import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Pet, PetAnimation, BUILT_IN_PETS, DEFAULT_PET_ID } from '../data/pets';
import { loadCustomPets, deleteCustomPet } from '../utils/petHatchService';

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
  addCustomPet: (pet: Pet) => void;
  removeCustomPet: (petId: string) => void;
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
  addCustomPet: () => {},
  removeCustomPet: () => {},
});

export const usePet = () => useContext(PetContext);

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
  const [customPets, setCustomPets] = useState<Pet[]>([]);

  // Load saved custom pets from device on mount
  useEffect(() => {
    loadCustomPets().then(setCustomPets).catch(() => {});
  }, []);

  const allPets = [...BUILT_IN_PETS, ...customPets];
  const activePet = allPets.find(p => p.id === activePetId) ?? BUILT_IN_PETS[0];
  const animation = STATUS_TO_ANIMATION[agentStatus];

  const setActivePet = useCallback((petId: string) => {
    setActivePetId(petId);
  }, []);

  const toggleVisibility = useCallback(() => setIsVisible(v => !v), []);
  const showPet = useCallback(() => setIsVisible(true), []);
  const hidePet = useCallback(() => setIsVisible(false), []);
  const setAgentStatus = useCallback((status: AgentStatus) => setAgentStatusState(status), []);

  const addCustomPet = useCallback((pet: Pet) => {
    setCustomPets(prev => [...prev.filter(p => p.id !== pet.id), { ...pet, isCustom: true }]);
    setActivePetId(pet.id);
    setIsVisible(true);
  }, []);

  const removeCustomPet = useCallback(async (petId: string) => {
    await deleteCustomPet(petId).catch(() => {});
    setCustomPets(prev => prev.filter(p => p.id !== petId));
    if (activePetId === petId) setActivePetId(DEFAULT_PET_ID);
  }, [activePetId]);

  return (
    <PetContext.Provider value={{
      activePet,
      isVisible,
      animation,
      agentStatus,
      allPets,
      setActivePet,
      toggleVisibility,
      showPet,
      hidePet,
      setAgentStatus,
      addCustomPet,
      removeCustomPet,
    }}>
      {children}
    </PetContext.Provider>
  );
}
