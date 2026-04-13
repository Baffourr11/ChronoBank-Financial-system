'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Database,
  Zap,
  RefreshCw
} from 'lucide-react';

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  accounts: string[];
  message: string;
}

interface ImportStats {
  statistics: {
    totalTransactions: number;
    dataRange: {
      start: string;
      end: string;
      totalDays: number;
    };
    hasEnoughData: boolean;
    hasHistoricalData: boolean;
  };
  recommendations: {
    needsMoreData: boolean;
    recommendedMinTransactions: number;
    needsLongerHistory: boolean;
    recommendedMinDays: number;
  };
}

export default function DataImportPage() {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    createMissingAccounts: true,
    batchSize: 100
  });

  useEffect(() => {
    fetchImportStats();
  }, []);

  const fetchImportStats = async () => {
    try {
      const response = await fetch('/api/data/import');
      if (response.ok) {
        const data = await response.json();
        setImportStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch import stats:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);

    try {
      const text = await file.text();
      const transactions = parseCSV(text);
      await importTransactions(transactions);
    } catch (error) {
      console.error('Failed to process file:', error);
      setImportResult({
        total: 0,
        imported: 0,
        skipped: 0,
        errors: ['Failed to process file. Please check the format.'],
        accounts: [],
        message: 'Import failed'
      });
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length !== headers.length) continue;

      const transaction: any = {};
      headers.forEach((header, index) => {
        const value = values[index];
        
        if (header === 'amount') {
          transaction[header] = parseFloat(value) || 0;
        } else if (header === 'date') {
          transaction[header] = value;
        } else {
          transaction[header] = value;
        }
      });

      transactions.push(transaction);
    }

    return transactions;
  };

  const importTransactions = async (transactions: any[]) => {
    setIsImporting(true);
    setImportProgress(0);

    try {
      const response = await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          options: importOptions
        })
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult(result.data);
        fetchImportStats(); // Refresh stats after import
      } else {
        const error = await response.json();
        setImportResult({
          total: 0,
          imported: 0,
          skipped: 0,
          errors: [error.message || 'Import failed'],
          accounts: [],
          message: 'Import failed'
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        total: 0,
        imported: 0,
        skipped: 0,
        errors: ['Network error during import'],
        accounts: [],
        message: 'Import failed'
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setSelectedFile(null);
    }
  };

  const generateSampleData = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/data/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: {
            monthsOfHistory: 12,
            irregularIncome: true,
            includeSeasonalPatterns: true,
            baseIncome: 3000,
            varianceLevel: 'medium'
          },
          generateAccounts: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult(result.data);
        fetchImportStats(); // Refresh stats after generation
      } else {
        const error = await response.json();
        setImportResult({
          total: 0,
          imported: 0,
          skipped: 0,
          errors: [error.message || 'Sample data generation failed'],
          accounts: [],
          message: 'Generation failed'
        });
      }
    } catch (error) {
      console.error('Sample data generation failed:', error);
      setImportResult({
        total: 0,
        imported: 0,
        skipped: 0,
        errors: ['Network error during generation'],
        accounts: [],
        message: 'Generation failed'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadSampleCSV = async () => {
    try {
      const response = await fetch('/api/data/sample?format=csv&months=12');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample-transactions.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download sample CSV:', error);
    }
  };

  const getDataQualityColor = (hasEnoughData: boolean) => {
    return hasEnoughData ? 'text-green-600' : 'text-orange-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground">
            Import historical data and generate sample data for AI analysis
          </p>
        </div>
        <Button onClick={fetchImportStats}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      {/* Current Data Status */}
      {importStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Current Data Status
            </CardTitle>
            <CardDescription>
              Overview of your current transaction data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{importStats.statistics.totalTransactions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Range</p>
                <p className="text-lg font-semibold">{importStats.statistics.dataRange.totalDays} days</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Quality</p>
                <p className={`text-lg font-semibold ${getDataQualityColor(importStats.statistics.hasEnoughData)}`}>
                  {importStats.statistics.hasEnoughData ? 'Good' : 'Needs More'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Historical Data</p>
                <p className={`text-lg font-semibold ${getDataQualityColor(importStats.statistics.hasHistoricalData)}`}>
                  {importStats.statistics.hasHistoricalData ? 'Available' : 'Limited'}
                </p>
              </div>
            </div>

            {importStats.recommendations.needsMoreData && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Recommendations:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {importStats.recommendations.needsMoreData && (
                        <li>Need at least {importStats.recommendations.recommendedMinTransactions} transactions for accurate AI analysis</li>
                      )}
                      {importStats.recommendations.needsLongerHistory && (
                        <li>Need at least {importStats.recommendations.recommendedMinDays} days of historical data</li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Options */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload CSV</TabsTrigger>
          <TabsTrigger value="generate">Generate Sample</TabsTrigger>
          <TabsTrigger value="download">Download Template</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Transaction Data
              </CardTitle>
              <CardDescription>
                Import your historical transaction data from a CSV file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* File Upload */}
                <div>
                  <Label htmlFor="file-upload">Select CSV File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={isImporting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV format: date, type, category, amount, description, accountName
                  </p>
                </div>

                {/* Import Options */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Import Options</h4>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="skip-duplicates"
                      checked={importOptions.skipDuplicates}
                      onCheckedChange={(checked) => 
                        setImportOptions(prev => ({ ...prev, skipDuplicates: checked }))
                      }
                    />
                    <Label htmlFor="skip-duplicates">Skip duplicate transactions</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="create-accounts"
                      checked={importOptions.createMissingAccounts}
                      onCheckedChange={(checked) => 
                        setImportOptions(prev => ({ ...prev, createMissingAccounts: checked }))
                      }
                    />
                    <Label htmlFor="create-accounts">Create missing accounts</Label>
                  </div>
                  <div>
                    <Label htmlFor="batch-size">Batch Size: {importOptions.batchSize}</Label>
                    <input
                      id="batch-size"
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={importOptions.batchSize}
                      onChange={(e) => 
                        setImportOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))
                      }
                      className="w-full mt-2"
                    />
                  </div>
                </div>

                {/* Progress */}
                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Importing...</span>
                      <span className="text-sm">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="w-full" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Generate Sample Data
              </CardTitle>
              <CardDescription>
                Create realistic sample data with Ghanaian market patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate 12 months of sample transaction data including:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Irregular income patterns (informal sector)</li>
                  <li>Seasonal spending (Christmas, Easter, festivals)</li>
                  <li>Payday spending cycles (25th-5th of month)</li>
                  <li>Ghanaian-specific expense categories</li>
                  <li>Realistic variance and volatility</li>
                </ul>

                <Button 
                  onClick={generateSampleData}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Sample Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="download" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download CSV Template
              </CardTitle>
              <CardDescription>
                Get a sample CSV template with the correct format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download a pre-formatted CSV template with sample data:
                </p>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Required Columns:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><code>date</code> - Transaction date (YYYY-MM-DD)</div>
                    <div><code>type</code> - income, expense, or transfer</div>
                    <div><code>category</code> - Expense category</div>
                    <div><code>amount</code> - Transaction amount</div>
                    <div><code>description</code> - Transaction description</div>
                    <div><code>accountName</code> - Account name (optional)</div>
                  </div>
                </div>

                <Button onClick={downloadSampleCSV} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.imported > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              )}
              Import Results
            </CardTitle>
            <CardDescription>
              {importResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Processed</p>
                  <p className="text-2xl font-bold">{importResult.total}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Successfully Imported</p>
                  <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                  <p className="text-2xl font-bold text-orange-600">{importResult.skipped}</p>
                </div>
              </div>

              {importResult.accounts.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Accounts Created:</p>
                  <div className="flex flex-wrap gap-1">
                    {importResult.accounts.map((account, index) => (
                      <Badge key={index} variant="secondary">
                        {account}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-red-600">Errors:</p>
                  <div className="space-y-1">
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <p key={index} className="text-sm text-red-600">{error}</p>
                    ))}
                    {importResult.errors.length > 5 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {importResult.errors.length - 5} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
