import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DynamicElementsConfiguration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadingCatches, setUploadingCatches] = useState(false);
  const [uploadingThrows, setUploadingThrows] = useState(false);
  const [uploadingGeneralCriteria, setUploadingGeneralCriteria] = useState(false);
  const [uploadingPrerecordedRiskComponents, setUploadingPrerecordedRiskComponents] = useState(false);
  const [uploadingPrerecordedRisks, setUploadingPrerecordedRisks] = useState(false);
  const [uploadingDBsForRisks, setUploadingDBsForRisks] = useState(false);
  const [uploadingVerticalRotations, setUploadingVerticalRotations] = useState(false);
  const [uploadingPreAcrobaticElements, setUploadingPreAcrobaticElements] = useState(false);
  const [uploadingThrowCombinations, setUploadingThrowCombinations] = useState(false);
  const [uploadingCatchCombinations, setUploadingCatchCombinations] = useState(false);
  
  const catchesInputRef = useRef<HTMLInputElement>(null);
  const throwsInputRef = useRef<HTMLInputElement>(null);
  const generalCriteriaInputRef = useRef<HTMLInputElement>(null);
  const prerecordedRiskComponentsInputRef = useRef<HTMLInputElement>(null);
  const prerecordedRisksInputRef = useRef<HTMLInputElement>(null);
  const dbsForRisksInputRef = useRef<HTMLInputElement>(null);
  const verticalRotationsInputRef = useRef<HTMLInputElement>(null);
  const preAcrobaticElementsInputRef = useRef<HTMLInputElement>(null);
  const throwCombinationsInputRef = useRef<HTMLInputElement>(null);
  const catchCombinationsInputRef = useRef<HTMLInputElement>(null);

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

  const handleCsvUpload = async (
    file: File, 
    functionName: string, 
    setUploading: (val: boolean) => void,
    entityName: string
  ) => {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to upload CSV files");
        return;
      }

      const csvContent = await file.text();
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { csvContent },
      });

      if (error) {
        console.error(`Error uploading ${entityName}:`, error);
        toast.error(`Failed to upload ${entityName}: ${error.message}`);
        return;
      }

      if (data?.success) {
        toast.success(data.message || `Successfully imported ${entityName}`);
      } else {
        toast.error(data?.error || `Failed to import ${entityName}`);
      }
    } catch (error) {
      console.error(`Error uploading ${entityName}:`, error);
      toast.error(`Failed to upload ${entityName}`);
    } finally {
      setUploading(false);
    }
  };

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
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Dynamic Elements Configuration
        </h1>
        <div className="w-10" />
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* CSV Upload Section */}
        <h2 className="text-xl font-semibold mb-4 text-foreground">CSV Data Import</h2>
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Catches CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>Catches</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: code, apparatus, extra criteria, name, notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={catchesInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-dynamic-catches-csv', setUploadingCatches, 'catches');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => catchesInputRef.current?.click()}
                disabled={uploadingCatches}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingCatches ? "Uploading..." : "Upload Catches CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* Throws CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>Throws</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: code, apparatus, name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={throwsInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-dynamic-throws-csv', setUploadingThrows, 'throws');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => throwsInputRef.current?.click()}
                disabled={uploadingThrows}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingThrows ? "Uploading..." : "Upload Throws CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* General Criteria CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>General Criteria</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: code, name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={generalCriteriaInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-dynamic-general-criteria-csv', setUploadingGeneralCriteria, 'general criteria');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => generalCriteriaInputRef.current?.click()}
                disabled={uploadingGeneralCriteria}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingGeneralCriteria ? "Uploading..." : "Upload General Criteria CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* Prerecorded Risk Components CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>Prerecorded Risk Components</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: risk_code, risk_component_code, description, value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={prerecordedRiskComponentsInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-prerecorded-risks-csv', setUploadingPrerecordedRiskComponents, 'prerecorded risk components');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => prerecordedRiskComponentsInputRef.current?.click()}
                disabled={uploadingPrerecordedRiskComponents}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingPrerecordedRiskComponents ? "Uploading..." : "Upload Risk Components CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* Prerecorded Risks CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>Prerecorded Risks</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: risk_code, name, rotations_value, series
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={prerecordedRisksInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-prerecorded-risks-main-csv', setUploadingPrerecordedRisks, 'prerecorded risks');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => prerecordedRisksInputRef.current?.click()}
                disabled={uploadingPrerecordedRisks}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingPrerecordedRisks ? "Uploading..." : "Upload Prerecorded Risks CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* DBs for Risks CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>DBs for Risks</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: DB_group, group, code, name, description, value, turn_degrees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={dbsForRisksInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-dbs-for-risks-csv', setUploadingDBsForRisks, 'DBs for Risks');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => dbsForRisksInputRef.current?.click()}
                disabled={uploadingDBsForRisks}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingDBsForRisks ? "Uploading..." : "Upload DBs for Risks CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* Vertical Rotations CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>Vertical Rotations</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: group, group_name, DB, code, name, description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={verticalRotationsInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-vertical-rotations-csv', setUploadingVerticalRotations, 'vertical rotations');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => verticalRotationsInputRef.current?.click()}
                disabled={uploadingVerticalRotations}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingVerticalRotations ? "Uploading..." : "Upload Vertical Rotations CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* Pre-acrobatic Elements CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>Pre-acrobatic Elements</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: group_code, group, name, level_change, 2bases_series
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={preAcrobaticElementsInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-pre-acrobatic-elements-csv', setUploadingPreAcrobaticElements, 'pre-acrobatic elements');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => preAcrobaticElementsInputRef.current?.click()}
                disabled={uploadingPreAcrobaticElements}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingPreAcrobaticElements ? "Uploading..." : "Upload Pre-acrobatic Elements CSV"}
              </Button>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
};

export default DynamicElementsConfiguration;
