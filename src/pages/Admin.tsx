import { useState, useEffect } from "react";
import { ArrowLeft, FileText, ListCheck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });

      if (error || !data) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdminStatus();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <div className="w-10" />
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-3">
          <Card 
            className="cursor-pointer hover:bg-accent transition-colors" 
            onClick={() => navigate("/admin/apparatus-configuration")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <ListCheck className="h-8 w-8 text-primary" />
                <CardTitle>Apparatus Configuration</CardTitle>
              </div>
              <CardDescription>
                Manage criteria CSV imports and symbol uploads
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent transition-colors" 
            onClick={() => navigate("/admin/element-configuration")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                <CardTitle>Element Configuration</CardTitle>
              </div>
              <CardDescription>
                Manage jumps, balances, and rotations data
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent transition-colors" 
            onClick={() => navigate("/admin/general-configurations")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>General Configurations</CardTitle>
              </div>
              <CardDescription>
                Upload and manage rulebook PDFs
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent transition-colors" 
            onClick={() => navigate("/admin/symbol-management")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                <CardTitle>Symbol Management</CardTitle>
              </div>
              <CardDescription>
                View, delete, and manage all symbol images
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;
