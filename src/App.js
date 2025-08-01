import React, { useState } from 'react';
import axios from 'axios';
import { Search, Download, AlertCircle, Globe, Image, FileText } from 'lucide-react';

function App() {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState([]);
  const [auditResults, setAuditResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentUrl] = useState('');
  const [error, setError] = useState('');

  const handleAnalyzeSitemap = async () => {
    if (!sitemapUrl) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/analyze', { sitemapUrl });
      setUrls(response.data.urls);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze sitemap');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    if (urls.length === 0) return;
    
    setLoading(true);
    setProgress(0);
    setError('');
    
    try {
      const response = await axios.post('/api/audit', { urls });
      setAuditResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to run audit');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!auditResults) return;
    
    try {
      await axios.post('/api/generate-report', auditResults);
      // In a real implementation, you'd handle file download here
      alert('Report generated successfully!');
    } catch (err) {
      setError('Failed to generate report');
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3000/api/generate-report', {
        pages: auditResults.pages,
        images: auditResults.images
      });

      const { filename } = response.data;
      const fileUrl = `http://localhost:3000/reports/${filename}`;

      // Trigger browser download
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = filename; // Hint to browser for filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // ✅ The browser will download to user's Downloads folder by default

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Something went wrong while generating the report.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get status code styling
  const getStatusCodeStyle = (status) => {
    if (status >= 200 && status < 300) {
      return 'bg-green-100 text-green-800';
    } else if (status >= 300 && status < 400) {
      return 'bg-blue-100 text-blue-800';
    } else if (status >= 400 && status < 500) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (status >= 500) {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get status code description
  const getStatusDescription = (status) => {
    const statusMap = {
      200: 'OK',
      301: 'Moved Permanently',
      302: 'Found',
      404: 'Not Found',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    return statusMap[status] || 'Unknown';
  };

  const calculateStats = () => {
    if (!auditResults) return null;
    
    const { pages, images } = auditResults;
    return {
      totalPages: pages.length,
      pagesWithIssues: pages.filter(p => p.notes).length,
      totalImages: images.length,
      imagesWithoutAlt: images.filter(i => i.hasAlt === 'No').length,
      brokenImages: images.filter(i => i.imageStatus === 'Broken').length,
      missingDescriptions: pages.filter(p => !p.metaDescription).length,
      errorPages: pages.filter(p => p.status >= 400).length,
      redirectPages: pages.filter(p => p.status >= 300 && p.status < 400).length
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">SEO Audit Tool</h1>
            </div>
            <div className="text-sm text-gray-500">
              Comprehensive SEO Analysis & Reporting
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Start SEO Audit</h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="sitemap" className="block text-sm font-medium text-gray-700 mb-2">
                Sitemap URL
              </label>
              <input
                id="sitemap"
                type="url"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://example.com/sitemap.xml"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAnalyzeSitemap}
                disabled={loading || !sitemapUrl}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
              {urls.length > 0 && (
                <button
                  onClick={handleRunAudit}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {loading ? 'Running...' : 'Run Audit'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* URL Discovery Results */}
        {urls.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Discovered URLs ({urls.length})
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              {urls.slice(0, 10).map((url, index) => (
                <div key={index} className="text-sm text-gray-600 py-1">
                  {url}
                </div>
              ))}
              {urls.length > 10 && (
                <div className="text-sm text-gray-500 py-1 italic">
                  ... and {urls.length - 10} more URLs
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {currentUrl ? `Analyzing: ${currentUrl}` : 'Starting audit...'}
            </p>
          </div>
        )}

        {/* Results Summary */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Globe className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Pages</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalPages}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  With issues: <span className="font-medium text-red-600">{stats.pagesWithIssues}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Image className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Images</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalImages}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  Missing alt: <span className="font-medium text-orange-600">{stats.imagesWithoutAlt}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Error Pages</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.errorPages}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  Redirects: <span className="font-medium text-blue-600">{stats.redirectPages}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Missing Meta</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.missingDescriptions}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  Broken images: <span className="font-medium text-red-600">{stats.brokenImages}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Results */}
        {auditResults && (
          <div className="space-y-6">
            {/* Pages Results */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Page Analysis Results</h3>
                  <button
                    onClick={handleGenerateReport}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? 'Generating...' : 'Download Report'}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">H1</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditResults.pages.map((page, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          <a 
                            href={page.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:text-blue-600 underline"
                            title={page.url}
                          >
                            {page.url}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusCodeStyle(page.status)}`}>
                              {page.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {getStatusDescription(page.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={page.titleOriginal}>
                            {page.titleOriginal || <span className="text-gray-400 italic">Missing</span>}
                          </div>
                          {page.titleSuggested && (
                            <div className="text-xs text-blue-600 truncate mt-1" title={page.titleSuggested}>
                              Suggested: {page.titleSuggested}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            page.h1Valid === 'Yes' ? 'bg-green-100 text-green-800' : 
                            page.h1Valid === 'Multiple' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {page.h1Valid} ({page.h1Count})
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>{page.totalImages} total</div>
                          {page.imagesWithoutAlt > 0 && (
                            <div className="text-xs text-orange-600">
                              {page.imagesWithoutAlt} missing alt
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                          <div className="truncate" title={page.notes}>
                            {page.notes || <span className="text-green-600 italic">No issues</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {auditResults.pages.length > 10 && (
                <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 text-center">
                  Showing all {auditResults.pages.length} pages. Download full report for detailed analysis.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;