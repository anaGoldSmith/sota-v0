import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SavedRoutine {
  id: string;
  name: string;
  apparatus: string | null;
  year: string | null;
  gymnast_name: string | null;
  total_db: number;
  total_da: number;
  created_at: string;
}

const Routines = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [routines, setRoutines] = useState<SavedRoutine[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from('routines' as any).select('id, name, apparatus, year, gymnast_name, total_db, total_da, created_at').order('created_at', { ascending: false }) as any);
    if (error) {
      console.error(error);
    } else {
      setRoutines((data || []) as SavedRoutine[]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from('routines' as any).delete().eq('id', id) as any);
    if (error) {
      toast({ title: "Error deleting routine", description: error.message, variant: "destructive" });
    } else {
      setRoutines(prev => prev.filter(r => r.id !== id));
      toast({ title: "Routine deleted" });
    }
  };

  const filtered = routines.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">My Routines</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-foreground">All Routines</h2>
            
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="text"
                placeholder="Type routine name"
                className="pl-10 h-12"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Routines List */}
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {routines.length === 0 ? 'No routines saved yet.' : 'No routines match your search.'}
              </p>
            ) : (
              <div className="space-y-3 mb-6">
                {filtered.map((routine) => (
                  <Card key={routine.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{routine.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {routine.apparatus && (
                          <Badge variant="outline" className="text-xs capitalize">{routine.apparatus}</Badge>
                        )}
                        {routine.year && (
                          <Badge variant="outline" className="text-xs">{routine.year}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          DB: {Number(routine.total_db).toFixed(2)} | DA: {Number(routine.total_da).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(routine.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {/* Add Routine Button */}
            <Button 
              size="lg" 
              className="w-full h-14 text-lg"
              onClick={() => navigate("/routine-calculator")}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Routine
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Routines;
