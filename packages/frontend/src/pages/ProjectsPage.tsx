import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Plus, Search, FolderKanban, Clock, DollarSign, Users } from 'lucide-react';

export function ProjectsPage() {
  const projects = [
    { name: 'CloudBooks Pro', client: 'Internal', status: 'active', budget: 50000, spent: 32500, hours: 216, team: 4, progress: 65 },
    { name: 'Website Redesign', client: 'Acme Corp', status: 'active', budget: 25000, spent: 18200, hours: 120, team: 3, progress: 73 },
    { name: 'Mobile App MVP', client: 'Tech Solutions', status: 'active', budget: 40000, spent: 12000, hours: 80, team: 2, progress: 30 },
    { name: 'Annual Audit Prep', client: 'Internal', status: 'on_hold', budget: 10000, spent: 4500, hours: 30, team: 2, progress: 45 },
    { name: 'E-commerce Platform', client: 'Global Trading', status: 'completed', budget: 60000, spent: 58000, hours: 380, team: 5, progress: 100 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-gray-500 mt-1">Track projects, budgets, and team allocation</p>
        </div>
        <Button><Plus size={16} className="mr-1" /> New Project</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><FolderKanban size={16} /> Active Projects</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{projects.filter(p => p.status === 'active').length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><DollarSign size={16} /> Total Budget</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">AED {projects.reduce((s, p) => s + p.budget, 0).toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Clock size={16} /> Total Hours</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{projects.reduce((s, p) => s + p.hours, 0)}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Users size={16} /> Team Members</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">8</p>
        </div>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card key={project.name}>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                  <p className="text-sm text-gray-500">{project.client}</p>
                </div>
                <Badge variant={project.status === 'active' ? 'success' : project.status === 'completed' ? 'info' : 'warning'}>
                  {project.status === 'on_hold' ? 'On Hold' : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${project.progress === 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Budget */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Budget</span>
                <span className="font-medium">AED {project.spent.toLocaleString()} / {project.budget.toLocaleString()}</span>
              </div>

              {/* Stats */}
              <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1 text-xs text-gray-500"><Clock size={12} /> {project.hours}h logged</div>
                <div className="flex items-center gap-1 text-xs text-gray-500"><Users size={12} /> {project.team} members</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
