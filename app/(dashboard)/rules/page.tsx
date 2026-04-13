'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Play, 
  Edit, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Settings,
  Target,
  Calendar
} from 'lucide-react';

interface Rule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: any[];
  actions: any[];
  schedule: any;
  executionCount: number;
  lastExecuted?: string;
  createdAt: string;
}

interface RuleFormData {
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  conditions: any[];
  actions: any[];
  schedule: any;
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    description: '',
    priority: 5,
    isActive: true,
    conditions: [],
    actions: [],
    schedule: { type: 'triggered' }
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/rules?includeExecutions=true');
      if (response.ok) {
        const data = await response.json();
        setRules(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRule = async () => {
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsCreateDialogOpen(false);
        fetchRules();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    try {
      const response = await fetch(`/api/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setEditingRule(null);
        fetchRules();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleExecuteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to execute rule:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 5,
      isActive: true,
      conditions: [],
      actions: [],
      schedule: { type: 'triggered' }
    });
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, {
        type: 'balance',
        operator: 'greater_than',
        field: '',
        value: ''
      }]
    }));
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, {
        type: 'create_transaction',
        params: {
          type: 'expense',
          category: '',
          amount: 0,
          description: ''
        }
      }]
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((cond, i) => 
        i === index ? { ...cond, [field]: value } : cond
      )
    }));
  };

  const updateAction = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, [field]: field === 'params' ? { ...action.params, ...value } : value } : action
      )
    }));
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-500';
    if (priority >= 6) return 'bg-orange-500';
    if (priority >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-400" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Financial Rules</h1>
          <Button><Plus className="w-4 h-4 mr-2" />Create Rule</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse" />
                <div className="h-3 bg-muted rounded w-1/2 mb-4 animate-pulse" />
                <div className="h-2 bg-muted rounded w-full mb-2 animate-pulse" />
                <div className="h-2 bg-muted rounded w-2/3 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Rules</h1>
          <p className="text-muted-foreground">
            Automate your financial decisions with customizable rules
          </p>
        </div>
        <Dialog open={isCreateDialogOpen || !!editingRule} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingRule(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
              <DialogDescription>
                Define conditions and actions to automate your financial decisions
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Rule Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Tax Reserve Automation"
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (Low)</SelectItem>
                      <SelectItem value="5">5 (Medium)</SelectItem>
                      <SelectItem value="8">8 (High)</SelectItem>
                      <SelectItem value="10">10 (Critical)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this rule does..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Rule is active</Label>
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Conditions</Label>
                  <Button variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Condition
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Condition {index + 1}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Select value={condition.type} onValueChange={(value) => updateCondition(index, 'type', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="balance">Account Balance</SelectItem>
                            <SelectItem value="transaction">Transaction</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="amount">Amount</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={condition.operator} onValueChange={(value) => updateCondition(index, 'operator', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="greater_than">Greater Than</SelectItem>
                            <SelectItem value="less_than">Less Than</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={condition.value}
                          onChange={(e) => updateCondition(index, 'value', e.target.value)}
                          placeholder="Value"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Actions</Label>
                  <Button variant="outline" size="sm" onClick={addAction}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Action
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.actions.map((action, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Action {index + 1}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeAction(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Select value={action.type} onValueChange={(value) => updateAction(index, 'type', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="create_transaction">Create Transaction</SelectItem>
                            <SelectItem value="send_alert">Send Alert</SelectItem>
                            <SelectItem value="transfer">Transfer Funds</SelectItem>
                            <SelectItem value="update_account">Update Account</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={action.params?.description || ''}
                          onChange={(e) => updateAction(index, 'params', { description: e.target.value })}
                          placeholder="Description"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingRule(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={editingRule ? handleUpdateRule : handleCreateRule}>
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules Grid */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Rules Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first financial rule to start automating your decisions
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(rule.priority)}`} />
                    </div>
                    <CardDescription className="text-sm">
                      {rule.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(rule.isActive)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Priority:</span>
                    <Badge variant="secondary">{rule.priority}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Executions:</span>
                    <span>{rule.executionCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Conditions:</span>
                    <span>{rule.conditions.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Actions:</span>
                    <span>{rule.actions.length}</span>
                  </div>
                  {rule.lastExecuted && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last run:</span>
                      <span>{new Date(rule.lastExecuted).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExecuteRule(rule.id)}
                    disabled={!rule.isActive}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRule(rule);
                      setFormData({
                        name: rule.name,
                        description: rule.description,
                        priority: rule.priority,
                        isActive: rule.isActive,
                        conditions: rule.conditions,
                        actions: rule.actions,
                        schedule: rule.schedule
                      });
                    }}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Quick Rule Templates
          </CardTitle>
          <CardDescription>
            Pre-configured rules for common financial automation needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => {
                setFormData({
                  name: 'Tax Reserve Automation',
                  description: 'Automatically reserve 15% for taxes when income exceeds GHS 1000',
                  priority: 8,
                  isActive: true,
                  conditions: [{
                    type: 'transaction',
                    operator: 'greater_than',
                    field: 'amount',
                    value: '1000'
                  }, {
                    type: 'transaction',
                    operator: 'equals',
                    field: 'type',
                    value: 'income'
                  }],
                  actions: [{
                    type: 'create_transaction',
                    params: {
                      type: 'expense',
                      category: 'Taxes',
                      amount: 150,
                      description: 'Tax reserve (15%)'
                    }
                  }],
                  schedule: { type: 'triggered' }
                });
                setIsCreateDialogOpen(true);
              }}
            >
              <Calendar className="w-6 h-6 mb-2" />
              <span className="text-sm">Tax Reserve</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => {
                setFormData({
                  name: 'Low Balance Alert',
                  description: 'Alert when account balance falls below GHS 500',
                  priority: 9,
                  isActive: true,
                  conditions: [{
                    type: 'balance',
                    operator: 'less_than',
                    field: 'Main Account',
                    value: '500'
                  }],
                  actions: [{
                    type: 'send_alert',
                    params: {
                      type: 'low_balance',
                      title: 'Low Balance Warning',
                      message: 'Main Account balance below GHS 500',
                      severity: 'high'
                    }
                  }],
                  schedule: { type: 'triggered' }
                });
                setIsCreateDialogOpen(true);
              }}
            >
              <AlertTriangle className="w-6 h-6 mb-2" />
              <span className="text-sm">Balance Alert</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => {
                setFormData({
                  name: 'Automatic Savings',
                  description: 'Transfer 20% of income to savings account',
                  priority: 7,
                  isActive: true,
                  conditions: [{
                    type: 'transaction',
                    operator: 'equals',
                    field: 'type',
                    value: 'income'
                  }],
                  actions: [{
                    type: 'transfer',
                    params: {
                      fromAccountId: '',
                      toAccountId: '',
                      amount: 0,
                      description: 'Automatic savings (20%)'
                    }
                  }],
                  schedule: { type: 'triggered' }
                });
                setIsCreateDialogOpen(true);
              }}
            >
              <Target className="w-6 h-6 mb-2" />
              <span className="text-sm">Auto Savings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
