import fs from "fs";

const p = "app/(dashboard)/rules/page.tsx";
let s = fs.readFileSync(p, "utf8");
const start = "          {/* Header */}";
const endMark = "          {/* Rules Grid */}";
const i = s.indexOf(start);
const j = s.indexOf(endMark, i);
if (i < 0 || j < 0) {
  console.error("markers not found", i, j);
  process.exit(1);
}

const headerBlock = `          <PageHeader
            title="Financial Rules"
            description={\`Prediction-driven automation for \${selectedDataset.name}\`}
            actions={
            <Dialog
              open={isCreateDialogOpen || !!editingRule}
              onOpenChange={(open) => {
                if (!open) {
                  setIsCreateDialogOpen(false);
                  setEditingRule(null);
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? "Edit Rule" : "Create New Rule"}
                  </DialogTitle>
                  <DialogDescription>
                    Define conditions and actions to automate your financial
                    decisions
                  </DialogDescription>
                </DialogHeader>
                <RuleFormPanel
                  formData={formData}
                  setFormData={setFormData}
                  datasetId={datasetId}
                  editing={!!editingRule}
                  onCancel={() => {
                    setIsCreateDialogOpen(false);
                    setEditingRule(null);
                    resetForm();
                  }}
                  onSubmit={editingRule ? handleUpdateRule : handleCreateRule}
                />
              </DialogContent>
            </Dialog>
            }
          />

`;

s = s.slice(0, i) + headerBlock + s.slice(j);
fs.writeFileSync(p, s);
console.log("patched", j - i, "bytes replaced");
