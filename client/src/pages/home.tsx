import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-900 flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  const projectStatus = [
    { name: "Backend", status: "Running", icon: "fas fa-server" },
    { name: "Frontend", status: "Running", icon: "fas fa-react" },
    { name: "Database", status: "Connected", icon: "fas fa-database" }
  ];

  const quickActions = [
    { name: "Open Terminal", icon: "fas fa-terminal" },
    { name: "Database Admin", icon: "fas fa-database" },
    { name: "Environment", icon: "fas fa-cog" }
  ];

  const techStack = [
    {
      name: "Express.js",
      description: "Backend API Server",
      port: "Port 8000",
      icon: "fab fa-js-square",
      bgColor: "bg-yellow-500/20",
      iconColor: "text-yellow-500"
    },
    {
      name: "React + TS",
      description: "Frontend Application", 
      port: "Port 5000",
      icon: "fab fa-react",
      bgColor: "bg-blue-500/20",
      iconColor: "text-blue-500"
    },
    {
      name: "PostgreSQL",
      description: "Database",
      port: "Port 5432",
      icon: "fas fa-database",
      bgColor: "bg-blue-600/20", 
      iconColor: "text-blue-600"
    }
  ];

  const availableScripts = [
    { name: "npm start", description: "Start both frontend and backend", icon: "fas fa-play" },
    { name: "npm run dev", description: "Development mode with hot reload", icon: "fas fa-code" },
    { name: "npm run build", description: "Build for production", icon: "fas fa-hammer" },
    { name: "npm run db:push", description: "Push database schema", icon: "fas fa-database" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-900">
      {/* Header */}
      <header className="border-b border-border/20 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-code text-primary-foreground text-sm"></i>
              </div>
              <h1 className="text-xl font-semibold text-foreground">Full-Stack Dashboard</h1>
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Development</span>
            </div>
            
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-muted-foreground">Welcome, {user?.username}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => logout()}
                    className="flex items-center space-x-2" 
                    data-testid="button-logout"
                  >
                    <i className="fas fa-sign-out-alt text-sm"></i>
                    <span className="text-sm font-medium">Logout</span>
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setLocation('/auth')}
                  className="flex items-center space-x-2" 
                  data-testid="button-login"
                >
                  <i className="fas fa-sign-in-alt text-sm"></i>
                  <span className="text-sm font-medium">Login</span>
                </Button>
              )}
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <i className="fas fa-user text-muted-foreground text-sm"></i>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Project Status Card */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/20" data-testid="card-project-status">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Project Status</h2>
                <div className="space-y-4">
                  {projectStatus.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded" data-testid={`status-${item.name.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/20" data-testid="card-quick-actions">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {quickActions.map((action, index) => (
                    <button 
                      key={index}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors text-left"
                      data-testid={`button-${action.name.toLowerCase().replace(' ', '-')}`}
                    >
                      <i className={`${action.icon} text-muted-foreground`}></i>
                      <span className="text-sm text-foreground">{action.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            {/* Tech Stack Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {techStack.map((tech, index) => (
                <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/20" data-testid={`card-tech-${tech.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 ${tech.bgColor} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                      <i className={`${tech.icon} ${tech.iconColor} text-xl`}></i>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{tech.name}</h3>
                    <p className="text-sm text-muted-foreground">{tech.description}</p>
                    <div className="mt-3 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full inline-block">
                      {tech.port}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Project Structure */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/20" data-testid="card-project-structure">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <i className="fas fa-folder-tree text-muted-foreground mr-2"></i>
                  Project Structure
                </h2>
                
                <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm">
                  <div className="space-y-1 text-muted-foreground">
                    <div className="flex items-center">
                      <i className="fas fa-folder text-yellow-500 mr-2"></i>
                      <span className="text-foreground">fullstack-app/</span>
                    </div>
                    <div className="ml-4 space-y-1">
                      <div className="flex items-center">
                        <i className="fas fa-folder text-yellow-500 mr-2"></i>
                        <span className="text-foreground">client/</span>
                      </div>
                      <div className="ml-4 space-y-1">
                        <div><i className="fas fa-folder text-yellow-500 mr-2"></i>src/</div>
                        <div><i className="fas fa-file-code text-blue-400 mr-2"></i>index.html</div>
                        <div><i className="fas fa-file-code text-gray-400 mr-2"></i>vite.config.ts</div>
                      </div>
                      <div className="flex items-center">
                        <i className="fas fa-folder text-yellow-500 mr-2"></i>
                        <span className="text-foreground">server/</span>
                      </div>
                      <div className="ml-4 space-y-1">
                        <div><i className="fas fa-file-code text-blue-400 mr-2"></i>index.ts</div>
                        <div><i className="fas fa-file-code text-blue-400 mr-2"></i>routes.ts</div>
                        <div><i className="fas fa-file-code text-gray-400 mr-2"></i>storage.ts</div>
                      </div>
                      <div className="flex items-center">
                        <i className="fas fa-folder text-yellow-500 mr-2"></i>
                        <span className="text-foreground">shared/</span>
                      </div>
                      <div className="ml-4 space-y-1">
                        <div><i className="fas fa-file-alt text-purple-400 mr-2"></i>schema.ts</div>
                      </div>
                      <div><i className="fas fa-file-code text-blue-400 mr-2"></i>package.json</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Development Console */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/20" data-testid="card-development-console">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center">
                    <i className="fas fa-terminal text-muted-foreground mr-2"></i>
                    Development Console
                  </h2>
                  <button className="text-xs bg-secondary/50 hover:bg-secondary/70 text-foreground px-3 py-1 rounded-md transition-colors" data-testid="button-expand-console">
                    <i className="fas fa-expand-arrows-alt mr-1"></i>
                    Expand
                  </button>
                </div>
                
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
                  <div className="space-y-1">
                    <div className="text-green-400">$ npm run dev</div>
                    <div className="text-gray-400">[server] starting express server</div>
                    <div className="text-blue-400">[Backend] Server running on port 5000</div>
                    <div className="text-blue-400">[Backend] Connected to PostgreSQL database</div>
                    <div className="text-orange-400">[Frontend] vite compiled successfully</div>
                    <div className="text-orange-400">[Frontend] Local: http://localhost:5000</div>
                    <div className="text-green-400">[Database] Users table initialized</div>
                    <div className="text-gray-400">[System] Hot reloading enabled for both frontend and backend</div>
                    <div className="flex items-center text-green-400">
                      <span className="animate-pulse mr-2">●</span>
                      <span>Ready for development</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Environment Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card/50 backdrop-blur-sm border-border/20" data-testid="card-database-connection">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <i className="fas fa-database text-muted-foreground mr-2"></i>
                    Database Connection
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Host:</span>
                      <span className="text-sm text-foreground font-mono">localhost</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Port:</span>
                      <span className="text-sm text-foreground font-mono">5432</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Database:</span>
                      <span className="text-sm text-foreground font-mono">fullstack_app</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm text-primary" data-testid="text-database-status">Connected</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/20" data-testid="card-sample-data">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <i className="fas fa-users text-muted-foreground mr-2"></i>
                    Sample Data
                  </h3>
                  <div className="bg-secondary/30 rounded-lg p-3 font-mono text-xs">
                    <div className="text-purple-400 mb-2">users table:</div>
                    <div className="space-y-1 text-muted-foreground ml-2">
                      <div>• id (VARCHAR PRIMARY KEY)</div>
                      <div>• username (TEXT UNIQUE)</div>
                      <div>• password (TEXT)</div>
                    </div>
                    <div className="mt-2 text-green-400" data-testid="text-users-count">
                      {isLoading ? 'Loading...' : `${users?.length || 0} users in database`}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Development Scripts */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/20" data-testid="card-development-scripts">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <i className="fas fa-rocket text-muted-foreground mr-2"></i>
                  Available Scripts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {availableScripts.map((script, index) => (
                    <button 
                      key={index}
                      className="bg-secondary/30 hover:bg-secondary/50 border border-border/20 rounded-lg p-4 text-left transition-colors group"
                      data-testid={`button-script-${script.name.replace(' ', '-')}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{script.name}</span>
                        <i className={`${script.icon} text-muted-foreground group-hover:text-primary transition-colors`}></i>
                      </div>
                      <p className="text-xs text-muted-foreground">{script.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
