import { useState, useMemo, useCallback, useEffect } from "react";
import { Task, TaskStatus, TaskPriority, TaskType, ImportanceRating, Department, TaskScope, STATUS_LABELS } from "@/entities/task";
import { useGSheetsTasks } from "@/hooks/useGSheetsTasks";
import { useDragOptimistic } from "@/hooks/useDragOptimistic";
import { useAnnouncementReadStatus, getUserId } from "@/hooks/useAnnouncementReadStatus";
import { isAdmin } from "@/lib/auth/session";
import { useSwipe } from "@/hooks/useSwipe";
import { useVoiceRecorder, ParsedTask } from "@/hooks/useVoiceRecorder";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";
import { Header } from "@/components/Header";
import { MobileDropZones } from "@/components/MobileDropZones";
import { SearchAndFilters } from "@/components/SearchAndFilters";
import { KanbanColumn } from "@/components/KanbanColumn";
import { DroppableKanbanColumn } from "@/components/DroppableKanbanColumn";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { AddTaskModal } from "@/components/AddTaskModal";
import { AnnouncementsList } from "@/components/AnnouncementsList";
import { InProgressView } from "@/components/InProgressView";

import { DraggableTaskCard } from "@/components/DraggableTaskCard";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { TaskScopeToggle } from "@/components/TaskScopeToggle";
import { VoiceRecordButton } from "@/components/VoiceRecordButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Map, Megaphone, Zap, ChevronLeft, ChevronRight, Mic, Plus } from "lucide-react";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUSES: TaskStatus[] = ["ideas", "planned", "in-progress", "review", "completed"];

const Index = () => {
  // TEST MODE: auth disabled (no login screen)
  const isLoggedIn = true;
  const [taskScope, setTaskScope] = useState<TaskScope>("digitization");
  
  // Fetch tasks from appropriate sheet based on taskScope
  const { tasks, loading, addTask, updateTask, deleteTask, refetch, syncStatus, lastSyncTime, manualSync } =
    useGSheetsTasks(taskScope, undefined, isLoggedIn);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultTaskType, setDefaultTaskType] = useState<TaskType>("idea");
  const [activeTab, setActiveTab] = useState("roadmap");
  const [mobileStatusFilter, setMobileStatusFilter] = useState<TaskStatus>("ideas");
  
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const currentUserId = getUserId();

  // Optimistic drag & drop with debouncing
  const { updateTaskStatus, tasksWithOptimistic, isTaskSyncing } = useDragOptimistic({
    tasks,
    onUpdateTask: updateTask,
    debounceMs: 400,
  });

  // DnD sensors with activation constraints to allow clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms hold before drag starts on touch
        tolerance: 5,
      },
    }),
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskType | "all">("all");
  // effectTypeFilter removed - no longer used
  const [importanceFilter, setImportanceFilter] = useState<ImportanceRating | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">("all");

  // Swipe navigation for mobile
  const currentStatusIndex = STATUSES.indexOf(mobileStatusFilter);

  const goToNextStatus = useCallback(() => {
    if (currentStatusIndex < STATUSES.length - 1) {
      setMobileStatusFilter(STATUSES[currentStatusIndex + 1]);
    }
  }, [currentStatusIndex]);

  const goToPrevStatus = useCallback(() => {
    if (currentStatusIndex > 0) {
      setMobileStatusFilter(STATUSES[currentStatusIndex - 1]);
    }
  }, [currentStatusIndex]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: goToNextStatus,
    onSwipeRight: goToPrevStatus,
    minSwipeDistance: 50,
    disabled: activeDragId !== null,
  });

  // Get unique owners for filter dropdown
  const owners = useMemo(() => {
    const ownerSet = new Set<string>();
    tasks.forEach((task) => {
      if (task.owner) ownerSet.add(task.owner);
    });
    return Array.from(ownerSet).sort();
  }, [tasks]);

  // Separate announcements from regular tasks - use optimistic data for tasks
  const { announcements, regularTasks } = useMemo(() => {
    const announcements: Task[] = [];
    const regularTasks: Task[] = [];

    tasksWithOptimistic.forEach((task) => {
      if (task.task_type === "announcement") {
        announcements.push(task);
      } else {
        regularTasks.push(task);
      }
    });

    // Sort announcements by created_at descending (newest first)
    announcements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { announcements, regularTasks };
  }, [tasksWithOptimistic]);

  // Track read status for announcements
  const { unreadCount, markAllAsRead, markAsRead, isUnread, hasUnread, needsUserName } = useAnnouncementReadStatus(announcements);

  // Mark announcements as read when user opens the tab
  useEffect(() => {
    if (activeTab === "announcements" && hasUnread && !needsUserName) {
      // Delay marking as read so user can see the "new" badges
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeTab, hasUnread, markAllAsRead, needsUserName]);

  // Apply filters (only to regular tasks, not announcements)
  // NOTE: Task scope filtering is now done at API level (different sheets), not here
  const filteredTasks = useMemo(() => {
    const toLowerSafe = (value: unknown) => {
      if (typeof value === 'string') return value.toLowerCase();
      if (value === null || value === undefined) return '';
      return String(value).toLowerCase();
    };

    try {
      return regularTasks.filter((task) => {
        if (!task || typeof task !== 'object') return false;

        // Search filter - with null safety
        const query = searchQuery.trim().toLowerCase();
        if (query) {
          const title = toLowerSafe((task as any).title);
          const summary = toLowerSafe((task as any).summary);
          const description = toLowerSafe((task as any).description);
          const author = toLowerSafe((task as any).author);
          const owner = toLowerSafe((task as any).owner);
          
          const matchesSearch =
            title.includes(query) ||
            summary.includes(query) ||
            description.includes(query) ||
            author.includes(query) ||
            owner.includes(query);
          if (!matchesSearch) return false;
        }

        // Status filter
        if (statusFilter !== "all" && task.status !== statusFilter) {
          return false;
        }

        // Priority filter
        if (priorityFilter !== "all" && task.priority !== priorityFilter) {
          return false;
        }

        // Task type filter
        if (taskTypeFilter !== "all" && task.task_type !== taskTypeFilter) {
          return false;
        }

        // Importance filter
        if (importanceFilter !== "all" && task.importance !== importanceFilter) {
          return false;
        }

        // Owner filter
        if (ownerFilter && task.owner !== ownerFilter) {
          return false;
        }

        // Department filter
        if (departmentFilter !== "all" && task.department !== departmentFilter) {
          return false;
        }

        return true;
      });
    } catch (error) {
      console.error('Error filtering tasks:', error);
      return regularTasks; // Return unfiltered on error
    }
  }, [
    regularTasks,
    searchQuery,
    statusFilter,
    priorityFilter,
    taskTypeFilter,
    importanceFilter,
    ownerFilter,
    departmentFilter,
  ]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      ideas: [],
      planned: [],
      "in-progress": [],
      review: [],
      completed: [],
    };

    filteredTasks.forEach((task) => {
      const status = task.status as TaskStatus;
      if (!grouped[status]) return;
      grouped[status].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  const handleOpenAddModal = (type: TaskType = "idea") => {
    setDefaultTaskType(type);
    setIsAddModalOpen(true);
  };

  const handleAddTask = async (data: {
    title: string;
    summary: string;
    description?: string;
    task_type: TaskType;
    priority: TaskPriority;
    importance?: ImportanceRating;
    department?: Department;
    url?: string;
    input_data_description?: string;
    problem_description?: string;
    file_name?: string;
    file_url?: string;
  }) => {
    await addTask({
      title: data.title,
      summary: data.summary,
      description: data.description || null,
      task_type: data.task_type,
      author: "", // Will be set by server from session
      priority: data.priority,
      effect_type: null, // Deprecated - always null
      importance: data.importance || null,
      department: data.department || null,
      digitization_section: null, // Deprecated - use department
      task_scope: taskScope,
      url: data.url || null,
      input_data_description: data.input_data_description || null,
      problem_description: data.problem_description || null,
      file_name: data.file_name || null,
      file_url: data.file_url || null,
      owner: taskScope === 'personal' ? currentUserId : null,
      linked_idea_id: null,
      linked_problem_id: null,
      result_before: null,
      result_action: null,
      result_after: null,
      due_date: null,
      reminder_sent: false,
    });
  };

  // Voice recorder for creating tasks via speech
  const handleVoiceTaskParsed = useCallback((parsed: ParsedTask) => {
    // Auto-create task from voice input
    addTask({
      title: parsed.title,
      summary: parsed.summary,
      description: parsed.description,
      task_type: parsed.task_type,
      author: "",
      priority: 'medium',
      effect_type: null,
      importance: parsed.importance,
      department: null,
      digitization_section: null,
      task_scope: taskScope,
      url: null,
      input_data_description: null,
      problem_description: null,
      file_name: null,
      file_url: null,
      owner: taskScope === 'personal' ? currentUserId : null,
      linked_idea_id: null,
      linked_problem_id: null,
      result_before: null,
      result_action: null,
      result_after: null,
      due_date: parsed.due_date,
      reminder_sent: false,
    });
  }, [addTask, taskScope, currentUserId]);

  const { isRecording, isProcessing, toggleRecording } = useVoiceRecorder({
    onTaskParsed: handleVoiceTaskParsed,
  });

  const handleTaskUpdate = (updatedTask: Task) => {
    refetch();
  };

  // Handle drag end - update task status with optimistic update
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasksWithOptimistic.find((t) => t.id === taskId);

    if (!task || task.status === newStatus) return;

    // Use optimistic update - no await, immediate visual feedback
    const success = await updateTaskStatus(taskId, newStatus);

    // Only show toast on failure since success is already visually indicated
    if (!success) {
      toast.error("Ошибка при изменении статуса");
    }
  };

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveDragId(event.active.id as string);
  };

  const activeDragTask = activeDragId ? tasksWithOptimistic.find((t) => t.id === activeDragId) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab header with sync status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            {/* Mobile tabs - stacked */}
            <TabsList className="grid w-full grid-cols-3 gap-1 h-auto p-1 sm:h-10 sm:w-auto">
              <TabsTrigger value="roadmap" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm sm:py-1.5">
                <Map className="h-4 w-4" />
                <span>Дорожная карта</span>
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm sm:py-1.5">
                <Zap className="h-4 w-4" />
                <span>В работе</span>
              </TabsTrigger>
              <TabsTrigger
                value="announcements"
                className="flex items-center gap-2 py-2.5 text-xs sm:text-sm sm:py-1.5 relative"
              >
                <Megaphone className="h-4 w-4" />
                <span>Объявления</span>
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Sync status indicator */}
            <SyncStatusIndicator
              status={syncStatus}
              lastSyncTime={lastSyncTime}
              onManualSync={manualSync}
              pollingInterval={30000}
            />
          </div>

          <TabsContent value="roadmap" className="space-y-4 mt-4">
            {/* Task scope toggle and add buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <TaskScopeToggle value={taskScope} onChange={setTaskScope} />
              <div className="flex items-center gap-2">
                <Button
                  onClick={toggleRecording}
                  disabled={isProcessing}
                  className={isRecording ? "animate-pulse" : ""}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : isRecording ? (
                    <span className="relative flex h-4 w-4 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-destructive"></span>
                    </span>
                  ) : (
                    <Mic className="h-4 w-4 mr-2" />
                  )}
                  {isRecording ? "Остановить" : "Голосом"}
                </Button>
                <Button onClick={() => handleOpenAddModal("idea")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Текстом
                </Button>
              </div>
            </div>

            <SearchAndFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              taskTypeFilter={taskTypeFilter}
              onTaskTypeFilterChange={setTaskTypeFilter}
              departmentFilter={departmentFilter}
              onDepartmentFilterChange={setDepartmentFilter}
              importanceFilter={importanceFilter}
              onImportanceFilterChange={setImportanceFilter}
              ownerFilter={ownerFilter}
              onOwnerFilterChange={setOwnerFilter}
              owners={owners}
              showOwnerFilter={isAdmin()}
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Mobile view - single column with swipe and drag-and-drop */}
                <div className="block md:hidden">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={pointerWithin}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Mobile drop zones - appear when dragging */}
                    <MobileDropZones 
                      activeDragId={activeDragId} 
                      currentStatus={activeDragTask?.status}
                    />

                    {/* Status navigation */}
                    <div className={`mb-4 flex items-center gap-2 transition-all ${activeDragId ? 'mt-20' : ''}`}>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={goToPrevStatus}
                        disabled={currentStatusIndex === 0 || !!activeDragId}
                        className="shrink-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex-1 text-center">
                        <div className="font-medium text-foreground">{STATUS_LABELS[mobileStatusFilter]}</div>
                        <div className="text-xs text-muted-foreground">
                          {tasksByStatus[mobileStatusFilter].length} задач • {activeDragId ? 'Перетащите наверх' : 'Свайп ← →'}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={goToNextStatus}
                        disabled={currentStatusIndex === STATUSES.length - 1 || !!activeDragId}
                        className="shrink-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Status dots indicator */}
                    <div className="flex justify-center gap-1.5 mb-4">
                      {STATUSES.map((status, index) => (
                        <button
                          key={status}
                          onClick={() => !activeDragId && setMobileStatusFilter(status)}
                          disabled={!!activeDragId}
                          className={`h-2 rounded-full transition-all ${
                            index === currentStatusIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                          } ${activeDragId ? 'opacity-50' : ''}`}
                          aria-label={STATUS_LABELS[status]}
                        />
                      ))}
                    </div>

                    {/* Swipeable task list with draggable cards */}
                    <div 
                      className="space-y-3 min-h-[200px]" 
                      {...swipeHandlers}
                    >
                      {tasksByStatus[mobileStatusFilter].map((task) => (
                        <DraggableTaskCard 
                          key={task.id} 
                          task={task} 
                          onClick={() => setSelectedTask(task)}
                          isSyncing={isTaskSyncing(task.id)}
                        />
                      ))}
                      {tasksByStatus[mobileStatusFilter].length === 0 && (
                        <div className="text-center py-8">
                          {mobileStatusFilter === "ideas" ? (
                            <Button variant="outline" onClick={() => handleOpenAddModal("idea")} className="gap-2">
                              Добавить предложение
                            </Button>
                          ) : mobileStatusFilter === "planned" ? (
                            <Button variant="outline" onClick={() => handleOpenAddModal("task")} className="gap-2">
                              Добавить задачу
                            </Button>
                          ) : (
                            <p className="text-muted-foreground text-sm">Нет задач в этом статусе</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Drag overlay for mobile */}
                    <DragOverlay>
                      {activeDragTask ? <TaskCard task={activeDragTask} onClick={() => {}} /> : null}
                    </DragOverlay>
                  </DndContext>
                </div>

                {/* Desktop view - kanban with drag and drop */}
                <div className="hidden md:block flex-1 min-h-0">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={pointerWithin}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="h-[calc(100vh-280px)] flex gap-2">
                      {STATUSES.map((status) => (
                        <DroppableKanbanColumn
                          key={status}
                          status={status}
                          tasks={tasksByStatus[status]}
                          onTaskClick={setSelectedTask}
                          onAddClick={(type) => handleOpenAddModal(type)}
                          isTaskSyncing={isTaskSyncing}
                        />
                      ))}
                    </div>
                    <DragOverlay>
                      {activeDragTask ? <TaskCard task={activeDragTask} onClick={() => {}} /> : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="mt-4">
            <InProgressView tasks={tasks} loading={loading} onTaskClick={setSelectedTask} />
          </TabsContent>

          <TabsContent value="announcements" className="mt-4">
            <AnnouncementsList
              announcements={announcements}
              loading={loading}
              isUnread={isUnread}
              onUpdateAnnouncement={updateTask}
              onOpenAnnouncement={(a) => markAsRead(a.id)}
            />
          </TabsContent>
        </Tabs>
      </main>

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        allTasks={tasks}
        onTaskUpdate={handleTaskUpdate}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
      />

      <AddTaskModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddTask}
        defaultTaskType={defaultTaskType}
      />
    </div>
  );
};

export default Index;
