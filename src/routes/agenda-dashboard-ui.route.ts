import { Hono } from 'hono';

const dashboardUI = new Hono();

/**
 * GET /agenda-dashboard/ui
 * Serve the main dashboard UI
 */
dashboardUI.get('/ui', (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agenda.js Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .status-running { background-color: #3b82f6; }
    .status-scheduled { background-color: #10b981; }
    .status-completed { background-color: #6b7280; }
    .status-failed { background-color: #ef4444; }
    .pulse-running { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
  </style>
</head>
<body class="bg-gray-100 min-h-screen">
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Agenda.js Dashboard</h1>
      <p class="text-gray-600">Monitor and manage your job queue</p>
    </div>

    <!-- Video Management Section -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">Video Management</h2>
        <button id="refresh-videos-btn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors">
          Refresh Videos
        </button>
      </div>

      <!-- Video Statistics -->
      <div id="video-stats-container" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="text-2xl font-bold text-blue-600" id="video-stat-total">-</div>
          <div class="text-sm text-blue-800">Total Videos</div>
        </div>
        <div class="bg-green-50 rounded-lg p-4">
          <div class="text-2xl font-bold text-green-600" id="video-stat-active">-</div>
          <div class="text-sm text-green-800">Active Videos</div>
        </div>
        <div class="bg-yellow-50 rounded-lg p-4">
          <div class="text-2xl font-bold text-yellow-600" id="video-stat-deleted">-</div>
          <div class="text-sm text-yellow-800">Soft Deleted</div>
        </div>
        <div class="bg-red-50 rounded-lg p-4">
          <div class="text-2xl font-bold text-red-600" id="video-stat-scheduled">-</div>
          <div class="text-sm text-red-800">Scheduled Deletions</div>
        </div>
      </div>

      <!-- Soft Deleted Videos -->
      <div class="border-t pt-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Recently Deleted Videos (7-day recovery window)</h3>
        <div id="deleted-videos-container" class="space-y-3">
          <div class="text-center text-gray-500">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
            <p class="mt-2">Loading deleted videos...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div id="stats-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-bold">T</span>
            </div>
          </div>
          <div class="ml-4">
            <dt class="text-sm font-medium text-gray-500 truncate">Total Jobs</dt>
            <dd class="text-lg font-semibold text-gray-900" id="stat-total">-</dd>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-bold">R</span>
            </div>
          </div>
          <div class="ml-4">
            <dt class="text-sm font-medium text-gray-500 truncate">Running</dt>
            <dd class="text-lg font-semibold text-gray-900" id="stat-running">-</dd>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-bold">S</span>
            </div>
          </div>
          <div class="ml-4">
            <dt class="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
            <dd class="text-lg font-semibold text-gray-900" id="stat-scheduled">-</dd>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-bold">C</span>
            </div>
          </div>
          <div class="ml-4">
            <dt class="text-sm font-medium text-gray-500 truncate">Completed</dt>
            <dd class="text-lg font-semibold text-gray-900" id="stat-completed">-</dd>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-bold">F</span>
            </div>
          </div>
          <div class="ml-4">
            <dt class="text-sm font-medium text-gray-500 truncate">Failed</dt>
            <dd class="text-lg font-semibold text-gray-900" id="stat-failed">-</dd>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <div class="flex flex-wrap gap-4 items-center justify-between">
        <div class="flex gap-4">
          <select id="status-filter" class="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Jobs</option>
            <option value="running">Running</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button id="refresh-btn" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
            Refresh
          </button>
        </div>
        <div class="text-sm text-gray-500" id="last-updated">
          Last updated: Never
        </div>
      </div>
    </div>

    <!-- Jobs List -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Jobs</h3>
      </div>
      <div id="jobs-container" class="p-6">
        <div class="text-center text-gray-500">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-2">Loading jobs...</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Job Details Modal -->
  <div id="job-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden z-50">
    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium text-gray-900" id="modal-title">Job Details</h3>
        <button id="close-modal" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div id="modal-content" class="max-h-96 overflow-y-auto">
        <div class="text-center text-gray-500">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-2">Loading job details...</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentPage = 1;
    let currentStatus = 'all';

    // Load initial data
    document.addEventListener('DOMContentLoaded', function() {
      loadStats();
      loadJobs();
      loadVideoStats();
      loadDeletedVideos();
    });

    // Load statistics
    async function loadStats() {
      try {
        const response = await fetch('/api/v1/agenda/stats');
        const data = await response.json();

        if (data.success) {
          document.getElementById('stat-total').textContent = data.data.total;
          document.getElementById('stat-running').textContent = data.data.running;
          document.getElementById('stat-scheduled').textContent = data.data.scheduled;
          document.getElementById('stat-completed').textContent = data.data.completed;
          document.getElementById('stat-failed').textContent = data.data.failed;
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    }

    // Load jobs
    async function loadJobs(status = 'all', page = 1) {
      try {
        const response = await fetch(\`/api/v1/agenda/jobs?status=\${status}&limit=20&skip=\${(page - 1) * 20}\`);
        const data = await response.json();

        if (data.success) {
          renderJobs(data.data.jobs);
          document.getElementById('last-updated').textContent = \`Last updated: \${new Date().toLocaleTimeString()}\`;
        }
      } catch (error) {
        console.error('Error loading jobs:', error);
        document.getElementById('jobs-container').innerHTML = '<p class="text-red-500 text-center">Error loading jobs</p>';
      }
    }

    // Render jobs list
    function renderJobs(jobs) {
      const container = document.getElementById('jobs-container');

      if (jobs.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No jobs found</p>';
        return;
      }

      const jobsHtml = jobs.map(job => {
        const statusClass = getStatusClass(job);
        const statusText = getStatusText(job);
        const nextRunTime = job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : 'N/A';
        const lastRunTime = job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never';

        return \`
          <div class="border-b border-gray-200 py-4 hover:bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center">
                  <h4 class="text-sm font-medium text-gray-900">\${job.name}</h4>
                  <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${statusClass}">
                    \${statusText}
                  </span>
                </div>
                <div class="mt-1 text-sm text-gray-500">
                  <p>ID: \${job._id}</p>
                  <p>Next run: \${nextRunTime}</p>
                  <p>Last run: \${lastRunTime}</p>
                  \${job.failCount > 0 ? \`<p class="text-red-600">Failed \${job.failCount} times</p>\` : ''}
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  onclick="showJobDetails('\${job._id}')"
                  class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Details
                </button>
                \${getActionButtons(job)}
              </div>
            </div>
          </div>
        \`;
      }).join('');

      container.innerHTML = jobsHtml;
    }

    // Get status class for styling
    function getStatusClass(job) {
      if (job.lockedAt) return 'bg-blue-100 text-blue-800';
      if (job.failedAt) return 'bg-red-100 text-red-800';
      if (job.lastFinishedAt) return 'bg-gray-100 text-gray-800';
      if (job.nextRunAt) return 'bg-green-100 text-green-800';
      return 'bg-gray-100 text-gray-800';
    }

    // Get status text
    function getStatusText(job) {
      if (job.lockedAt) return 'Running';
      if (job.failedAt) return 'Failed';
      if (job.lastFinishedAt) return 'Completed';
      if (job.nextRunAt) return 'Scheduled';
      return 'Unknown';
    }

    // Get action buttons based on job status
    function getActionButtons(job) {
      let buttons = '';

      if (!job.lockedAt && !job.lastFinishedAt && job.nextRunAt) {
        buttons += \`<button onclick="cancelJob('\${job._id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors">Cancel</button>\`;
      }

      if (job.failedAt) {
        buttons += \`<button onclick="retryJob('\${job._id}')" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors">Retry</button>\`;
      }

      return buttons;
    }

    // Show job details
    async function showJobDetails(jobId) {
      const modal = document.getElementById('job-modal');
      const content = document.getElementById('modal-content');

      modal.classList.remove('hidden');
      content.innerHTML = '<div class="text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div><p class="mt-2">Loading...</p></div>';

      try {
        const response = await fetch(\`/api/v1/agenda/jobs/\${jobId}\`);
        const data = await response.json();

        if (data.success) {
          const job = data.data;
          content.innerHTML = \`
            <div class="space-y-4">
              <div><strong>Name:</strong> \${job.name}</div>
              <div><strong>Type:</strong> \${job.type}</div>
              <div><strong>Priority:</strong> \${job.priority}</div>
              <div><strong>Next Run:</strong> \${job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : 'N/A'}</div>
              <div><strong>Last Run:</strong> \${job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}</div>
              <div><strong>Last Finished:</strong> \${job.lastFinishedAt ? new Date(job.lastFinishedAt).toLocaleString() : 'Never'}</div>
              <div><strong>Failed At:</strong> \${job.failedAt ? new Date(job.failedAt).toLocaleString() : 'Never'}</div>
              <div><strong>Fail Count:</strong> \${job.failCount}</div>
              \${job.failReason ? \`<div><strong>Fail Reason:</strong> \${job.failReason}</div>\` : ''}
              <div><strong>Data:</strong> <pre class="bg-gray-100 p-2 rounded text-xs overflow-auto">\${JSON.stringify(job.data, null, 2)}</pre></div>
            </div>
          \`;
        }
      } catch (error) {
        content.innerHTML = '<p class="text-red-500">Error loading job details</p>';
      }
    }

    // Cancel job
    async function cancelJob(jobId) {
      if (!confirm('Are you sure you want to cancel this job?')) return;

      try {
        const response = await fetch(\`/api/v1/agenda/jobs/\${jobId}/cancel\`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
          alert('Job cancelled successfully');
          loadJobs(currentStatus, currentPage);
          loadStats();
        } else {
          alert('Failed to cancel job');
        }
      } catch (error) {
        alert('Error cancelling job');
      }
    }

    // Retry job
    async function retryJob(jobId) {
      try {
        const response = await fetch(\`/api/v1/agenda/jobs/\${jobId}/retry\`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
          alert('Job scheduled for retry');
          loadJobs(currentStatus, currentPage);
          loadStats();
        } else {
          alert('Failed to retry job');
        }
      } catch (error) {
        alert('Error retrying job');
      }
    }

    // Load video statistics
    async function loadVideoStats() {
      try {
        const response = await fetch('/api/v1/agenda/videos/stats');
        const data = await response.json();

        if (data.success) {
          document.getElementById('video-stat-total').textContent = data.data.totalVideos;
          document.getElementById('video-stat-active').textContent = data.data.activeVideos;
          document.getElementById('video-stat-deleted').textContent = data.data.softDeletedVideos;
          document.getElementById('video-stat-scheduled').textContent = data.data.hardDeleteJobs;
        }
      } catch (error) {
        console.error('Error loading video stats:', error);
      }
    }

    // Load deleted videos
    async function loadDeletedVideos() {
      try {
        const response = await fetch('/api/v1/agenda/videos/deleted');
        const data = await response.json();

        if (data.success) {
          renderDeletedVideos(data.data);
        }
      } catch (error) {
        console.error('Error loading deleted videos:', error);
        document.getElementById('deleted-videos-container').innerHTML = '<p class="text-red-500 text-center">Error loading deleted videos</p>';
      }
    }

    // Render deleted videos list
    function renderDeletedVideos(videos) {
      const container = document.getElementById('deleted-videos-container');

      if (videos.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No deleted videos found</p>';
        return;
      }

      const videosHtml = videos.map(video => {
        const deletedDate = video.deletedAt ? new Date(video.deletedAt).toLocaleDateString() : 'Unknown';
        const canRecover = video.canRecover;
        const statusClass = canRecover ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
        const statusText = canRecover ? \`Recoverable (\${video.daysLeft} days left)\` : 'Recovery expired';

        return \`
          <div class="border border-gray-200 rounded-lg p-4 \${canRecover ? 'bg-yellow-50' : 'bg-red-50'}">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h4 class="font-medium text-gray-900">\${video.title}</h4>
                <p class="text-sm text-gray-600 mt-1">\${video.description || 'No description'}</p>
                <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>Deleted: \${deletedDate}</span>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium \${statusClass}">
                    \${statusText}
                  </span>
                </div>
              </div>
              <div class="flex gap-2">
                \${canRecover ? \`<button onclick="recoverVideo('\${video._id}')" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors">Recover</button>\` : ''}
                <button onclick="forceDeleteVideo('\${video._id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors">Force Delete</button>
              </div>
            </div>
          </div>
        \`;
      }).join('');

      container.innerHTML = videosHtml;
    }

    // Recover video
    async function recoverVideo(videoId) {
      if (!confirm('Are you sure you want to recover this video?')) return;

      try {
        const response = await fetch(\`/api/v1/agenda/videos/\${videoId}/recover\`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
          alert('Video recovered successfully!');
          loadVideoStats();
          loadDeletedVideos();
          loadStats();
          loadJobs();
        } else {
          alert('Failed to recover video: ' + (data.message || 'Unknown error'));
        }
      } catch (error) {
        alert('Error recovering video');
        console.error('Error:', error);
      }
    }

    // Force delete video
    async function forceDeleteVideo(videoId) {
      if (!confirm('Are you sure you want to permanently delete this video? This action cannot be undone!')) return;

      try {
        const response = await fetch(\`/api/v1/agenda/videos/\${videoId}/force-delete\`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
          alert('Video scheduled for immediate deletion!');
          loadVideoStats();
          loadDeletedVideos();
          loadStats();
          loadJobs();
        } else {
          alert('Failed to force delete video: ' + (data.message || 'Unknown error'));
        }
      } catch (error) {
        alert('Error force deleting video');
        console.error('Error:', error);
      }
    }

    // Event listeners
    document.getElementById('status-filter').addEventListener('change', function(e) {
      currentStatus = e.target.value;
      currentPage = 1;
      loadJobs(currentStatus, currentPage);
    });

    document.getElementById('refresh-btn').addEventListener('click', function() {
      loadStats();
      loadJobs(currentStatus, currentPage);
    });

    document.getElementById('refresh-videos-btn').addEventListener('click', function() {
      loadVideoStats();
      loadDeletedVideos();
    });

    document.getElementById('close-modal').addEventListener('click', function() {
      document.getElementById('job-modal').classList.add('hidden');
    });

    // Close modal when clicking outside
    document.getElementById('job-modal').addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.add('hidden');
      }
    });

    // Auto refresh every 30 seconds
    setInterval(() => {
      loadStats();
      loadJobs(currentStatus, currentPage);
      loadVideoStats();
      loadDeletedVideos();
    }, 30000);
  </script>
</body>
</html>`;

  return c.html(html);
});

export default dashboardUI;