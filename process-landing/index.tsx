import { Col, Row } from 'antd';
import React, { useRef } from 'react';
import { useHistory } from 'react-router-dom';
import synchronizer from '../../../../services/synchronizer';
import { HighestErrorCountGraph } from './components/Error-count-comparison';
import { JobPerformanceOverTime } from './components/job-perfomance-over-time';
import ProcessListV2, { ProcessListProps } from './components/process-list';
import ScheduledProcessGraph from './components/scheduled-process-graph';
import { TotalJobsGraphV2 } from './components/total-jobs-graph-v2';
import { TotalProcessGraph } from './components/total-process-graph';
import TotalProcessesGraphSync from './components/total-process-graph-sync';

const ProcessLanding = ({
  processList,
  getTotalJobsAPI,
  getProcessJobsAPI,
  getJobPerformanceAPI,
  getTotalProcessesCountAPI,
  getScheduledProcessAPI,
  organisationId,
  getJobsDetailsByStatusAPI,
  getErrorCount,
}: Props) => {
  const processListRef = useRef(null);
  const history = useHistory();
  const { hash = '' } = history?.location || {};

  React.useEffect(() => {
    if (hash) {
      const key = hash.replace('#', '');
      if (key === 'process-list' && processListRef.current) {
        processListRef?.current?.scrollIntoView();
      }
    }
  }, [hash, processListRef]);
  return (
    <div className="process-landing-container">
      <Row gutter={24}>
        <Col span={16}>
          <JobPerformanceOverTime
            organisationId={organisationId}
            getJobPerformanceAPI={getJobPerformanceAPI}
            getJobsDetailsByStatusAPI={getJobsDetailsByStatusAPI}
          />
        </Col>
        <Col span={8}>
          <TotalJobsGraphV2
            organisationId={organisationId}
            getTotalJobsAPI={getTotalJobsAPI}
            getJobsDetailsByStatusAPI={getJobsDetailsByStatusAPI}
          />
          {synchronizer.selectedSource === 'legacy-webhook' && (
            <TotalProcessGraph
              organisationId={organisationId}
              getTotalProcessesCountAPI={getTotalProcessesCountAPI}
            />
          )}
          {synchronizer.selectedSource === 'synchronizer' && (
            <TotalProcessesGraphSync
              organisationId={organisationId}
              getTotalProcessesCountAPI={getTotalProcessesCountAPI}
            />
          )}
        </Col>
      </Row>
      <div>
        <HighestErrorCountGraph getErrorCount={getErrorCount} />
      </div>
      <div>
        {synchronizer.selectedSource === 'legacy-webhook' && (
          <ScheduledProcessGraph
            getScheduledProcessAPI={getScheduledProcessAPI}
          />
        )}
      </div>
      <div ref={processListRef} id="process-list">
        <ProcessListV2 {...processList} getProcessJobsAPI={getProcessJobsAPI} />
      </div>
      {/* <div ref={processListRef} id="process-list-2">
        <ProcessList2V2
          {...processList}
          getProcessJobsAPI={getProcessJobsAPI}
        />
      </div> */}
    </div>
  );
};

export default React.memo(ProcessLanding);

interface Props {
  processList: ProcessListProps;
  getTotalJobsAPI: (filter) => Promise<any>;
  getProcessJobsAPI: (query?: any) => Promise<any>;
  getJobPerformanceAPI: (filter) => Promise<any>;
  getTotalProcessesCountAPI: (filter) => Promise<any>;
  getErrorCount: (fromDate: string, toDate: string) => Promise<any>;
  getScheduledProcessAPI: (
    startDate: string,
    numberOfDays: number,
  ) => Promise<any>;
  organisationId: string;
  getJobsDetailsByStatusAPI: (
    statusFilter: string,
    startTime?: number,
    endTime?: number,
    filter?: any,
  ) => Promise<any>;
}
