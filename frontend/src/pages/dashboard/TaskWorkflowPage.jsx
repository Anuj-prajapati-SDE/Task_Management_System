import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import TaskNode from '../../components/workflow/TaskNode';
import UserNode from '../../components/workflow/UserNode';
import TeamNode from '../../components/workflow/TeamNode';
import SubtaskNode from '../../components/workflow/SubtaskNode';
import { MdRefresh, MdAccountTree } from 'react-icons/md';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Give different dimensions based on node type for dagre calculations
    let width = 250;
    let height = 60;
    
    if (node.type === 'taskNode') { width = 270; height = 120; }
    if (node.type === 'userNode') { width = 180; height = 50; }
    if (node.type === 'teamNode') { width = 150; height = 50; }
    if (node.type === 'subtaskNode') { width = 180; height = 40; }

    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = { ...node };
    
    // Shift dagre node position (anchor=center center) to top left
    newNode.position = {
      x: nodeWithPosition.x - nodeWithPosition.width / 2,
      y: nodeWithPosition.y - nodeWithPosition.height / 2,
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

const TaskWorkflowPage = ({ teamId }) => {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  const nodeTypes = useMemo(() => ({ 
    taskNode: TaskNode,
    userNode: UserNode,
    teamNode: TeamNode,
    subtaskNode: SubtaskNode
  }), []);

  const fetchTasksAndBuildGraph = async () => {
    setLoading(true);
    try {
      // Fetch tasks and teams in parallel
      const taskEndpoint = teamId ? `/tasks?limit=100&team=${teamId}` : `/tasks?limit=100`;
      const [tasksRes, teamsRes] = await Promise.all([
        API.get(taskEndpoint),
        API.get('/teams')
      ]);
      
      const tasks = tasksRes.data.data || [];
      const teams = teamsRes.data.data || [];

      const initialNodes = [];
      const initialEdges = [];
      const addedNodeIds = new Set();

      const addNode = (node) => {
        if (!addedNodeIds.has(node.id)) {
          initialNodes.push(node);
          addedNodeIds.add(node.id);
        }
      };

      const addEdge = (source, target, animated = false, color = 'var(--primary)') => {
        const edgeId = `e-${source}-${target}`;
        // Prevent duplicate edges
        if (!initialEdges.some(e => e.id === edgeId)) {
          initialEdges.push({
            id: edgeId,
            source,
            target,
            animated,
            style: { stroke: color, strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: color,
            },
          });
        }
      };

      tasks.forEach((task) => {
        const taskId = `task-${task._id}`;
        
        // 1. Add Task Node
        addNode({
          id: taskId,
          type: 'taskNode',
          data: { 
            title: task.title, 
            status: task.status, 
            priority: task.priority,
            assignees: task.assignees,
            dueDate: task.dueDate
          },
          position: { x: 0, y: 0 }
        });

        // 2. Add Creator (assignedBy)
        if (task.assignedBy) {
          const creatorId = `user-${task.assignedBy._id}`;
          addNode({
            id: creatorId,
            type: 'userNode',
            data: { name: task.assignedBy.name, role: task.assignedBy.role, avatar: task.assignedBy.avatar },
            position: { x: 0, y: 0 }
          });
          // Edge: Creator -> Task
          addEdge(creatorId, taskId, false, 'var(--text-muted)');
        }

        // 3. Add Assignees (Users)
        if (task.assignees && task.assignees.length > 0) {
          task.assignees.forEach(assignee => {
            const assigneeId = `user-${assignee._id}`;
            addNode({
              id: assigneeId,
              type: 'userNode',
              data: { name: assignee.name, role: assignee.role, avatar: assignee.avatar },
              position: { x: 0, y: 0 }
            });
            // Edge: Task -> Assignee
            addEdge(taskId, assigneeId, task.status !== 'completed', task.status === 'completed' ? 'var(--success)' : 'var(--primary)');
          });
        }

        // 4. Add Team and Team Members
        if (task.team) {
          const teamId = `team-${task.team._id}`;
          addNode({
            id: teamId,
            type: 'teamNode',
            data: { name: task.team.name },
            position: { x: 0, y: 0 }
          });
          // Edge: Task -> Team
          addEdge(taskId, teamId, task.status !== 'completed', task.status === 'completed' ? 'var(--success)' : 'var(--primary)');

          // Find full team object to get members
          const fullTeam = teams.find(t => t._id.toString() === task.team._id.toString());
          if (fullTeam && fullTeam.members) {
            fullTeam.members.forEach(member => {
              if (member.user) {
                const memberId = `user-${member.user._id}`;
                addNode({
                  id: memberId,
                  type: 'userNode',
                  data: { name: member.user.name, role: member.user.role, avatar: member.user.avatar },
                  position: { x: 0, y: 0 }
                });
                // Edge: Team -> Team Member
                addEdge(teamId, memberId, false, 'var(--primary)');
              }
            });
          }
        }

        // 5. Add Subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach(subtask => {
            const subtaskId = `subtask-${subtask._id}`;
            addNode({
              id: subtaskId,
              type: 'subtaskNode',
              data: { title: subtask.title, isCompleted: subtask.isCompleted },
              position: { x: 0, y: 0 }
            });
            // Edge: Task -> Subtask
            addEdge(taskId, subtaskId, !subtask.isCompleted, subtask.isCompleted ? 'var(--success)' : 'var(--primary)');

            // Edge: Subtask -> Subtask Assignee (if exists and populated)
            if (subtask.assignee && subtask.assignee._id) {
              const subAssigneeId = `user-${subtask.assignee._id}`;
              addNode({
                id: subAssigneeId,
                type: 'userNode',
                data: { name: subtask.assignee.name, role: subtask.assignee.role, avatar: subtask.assignee.avatar },
                position: { x: 0, y: 0 }
              });
              // Edge: Subtask -> Assignee
              addEdge(subtaskId, subAssigneeId, false, 'var(--primary)');
            }
          });
        }
      });

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (err) {
      console.error('Failed to fetch tasks for workflow', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndBuildGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'taskNode') {
      const dbId = node.id.replace('task-', '');
      navigate(`/tasks/${dbId}`);
    } else if (node.type === 'teamNode') {
      const dbId = node.id.replace('team-', '');
      navigate(`/teams/${dbId}`);
    }
  }, [navigate]);

  return (
    <div style={{ height: teamId ? '600px' : 'calc(100vh - 120px)', width: '100%', position: 'relative' }}>
      {!teamId && (
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdAccountTree /> Delegation Workflow
          </h1>
          <p>Visualize how tasks are delegated from creators to teams and users.</p>
        </div>
      )}
      
      <div style={{ height: '100%', width: '100%', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-card)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            attributionPosition="bottom-right"
          >
            <Panel position="top-right">
              <button 
                className="btn btn-secondary" 
                onClick={fetchTasksAndBuildGraph}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '13px' }}
              >
                <MdRefresh /> Refresh
              </button>
            </Panel>
            <MiniMap zoomable pannable />
            <Controls />
            <Background color="var(--border)" gap={16} size={1} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

export default TaskWorkflowPage;
