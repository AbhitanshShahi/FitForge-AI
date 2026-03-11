import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TrainingPlan, User, UserProfile } from "../types";
import { authClient } from "../lib/auth";
import { api } from "../types/api";

interface AuthContextType {
  user: User | null;
  plan: TrainingPlan | null;
  loading: boolean;
  saveProfile: (
    profile: Omit<UserProfile, "userId" | "updatedAt">,
  ) => Promise<void>;
  generatePlan: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [neonUser, setNeonUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const isRefreshing = useRef(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const result = await authClient.getSession();
        if (result && result.data?.user) {
          setNeonUser(result.data.user);
        } else {
          setNeonUser(null);
        }
      } catch (err) {
        setNeonUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  useEffect(()=>{
    if(!loading){
      if(neonUser?.id){
        refreshData()
      } else{
        setPlan(null)
      }
      setLoading(false)
    }
  }, [neonUser?.id, loading])

  const refreshData = useCallback(async () => {
    if (!neonUser || isRefreshing.current) return;
    isRefreshing.current = true;

    try{
      const planData = await api.getCurrentPlan(neonUser.id).catch(()=>null)
      if(planData){
        setPlan({
          id: planData.id,
          userId: planData.userId,
          overview: planData.planJson.overview,
          weeklySchedule: planData.planJson.weeklySchedule,
          progression: planData.planJson.progression,
          version: planData.version,
          createdAt: planData.createdAt,
        });
      }
    } catch(error){
      console.error("Error refreshing data: ", error)
    } finally{
      isRefreshing.current = false
    }
  }, [neonUser?.id]);

  async function saveProfile(
    profileData: Omit<UserProfile, "userId" | "updatedAt">,
  ) {
    if (!neonUser) {
      throw new Error("User must be authenticated to save profile");
    }

    await api.saveProfile(neonUser.id, profileData);
    await refreshData();
  }

  async function generatePlan() {
    if (!neonUser) {
      throw new Error("User must be authenticated to Generate Plan");
    }

    await api.generatePlan(neonUser.id);
    await refreshData();
  }

  return (
    <AuthContext.Provider
      value={{ user: neonUser, plan, loading, saveProfile, generatePlan, refreshData }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
}
