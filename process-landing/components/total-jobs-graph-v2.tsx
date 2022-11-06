import { Spin } from 'antd';
import React from 'react';
import Bridge from '../../../../../common/bridge/Bridge';
import useSocket, {
  getControlRoom,
} from '../../../../../common/hooks/useSocket';
import synchronizer from '../../../../../services/synchronizer';
import CircularGraphV2 from '../../../../graphs/circular-graph-v2';
import JobsDetailsModal from './job-details-modal';
import { debounce } from 'lodash';
import CustomTooltip from '../../../../custom-tooltip';

const legend = [
  {
    color: '#53B563',
    name: 'Completed',
  },
  {
    color: '#CD4949',
    name: 'Exceptioned',
  },
  {
    color: '#D97635',
    name: 'Stopped',
  },
  {
    color: '#6E7D91',
    name: 'Suspended',
  },
  {
    color: '#4c91c9',
    name: 'Running',
  },
  {
    color: '#DB9D2E',
    name: 'Warning',
  },
  {
    color: '#9AC1E1',
    name: 'Pending',
  },
];

export const TotalJobsGraphV2 = ({
  getTotalJobsAPI,
  getJobsDetailsByStatusAPI,
  organisationId,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [botJobs, setBotJobs] = React.useState<any>({});
  const { getEvent, removeEvent } = useSocket(`${organisationId}/RPAProcesses`);
  const synchronizerEvent = useSocket(getControlRoom(organisationId));
  const [jobDetailsModal, setJobDetailsModal] = React.useState({
    visible: false,
    data: [],
    isLoading: false,
    status: '',
  });
  const chartData = React.useMemo(() => {
    if (Object.entries(botJobs || {}).length > 0) {
      const {
        completedJobs = 0,
        exceptionedJobs = 0,
        stoppedJobs = 0,
        suspendedJobs = 0,
        startedJobs = 0,
        warningJobs = 0,
        pendingJobs = 0,
      } = botJobs;
      return [
        completedJobs,
        exceptionedJobs,
        stoppedJobs,
        suspendedJobs,
        startedJobs,
        warningJobs,
        pendingJobs,
      ];
    }
    return [];
  }, [botJobs]);
  const [filter, setFilter] = React.useState([]);
  const filterRef = React.useRef([]);
  filterRef.current = filter;

  const getJobs = React.useCallback(
    async (isLoadingNeeded = true, functionId = []) => {
      setIsLoading(isLoadingNeeded && true);
      const res = await getTotalJobsAPI(functionId);
      setBotJobs(res);
      setIsLoading(false);
    },
    [],
  );

  React.useEffect(() => {
    const filterLs = localStorage.getItem('processFilter');
    const filterLsArray = filterLs ? filterLs.split(',').filter((f) => f) : [];
    setFilter(filterLsArray);
    getJobs(true, filterLsArray);
    if (synchronizer.selectedSource === 'legacy-webhook') {
      getEvent('rpa_process_completed', () => {
        getJobs(false, filterRef.current);
      });
      getEvent('rpa_process_exceptioned', () => {
        getJobs(false, filterRef.current);
      });
      getEvent('rpa_process_stopped', () => {
        getJobs(false, filterRef.current);
      });
      getEvent('rpa_process_suspened', () => {
        getJobs(false, filterRef.current);
      });
      getEvent('rpa_process_started', () => {
        getJobs(false, filterRef.current);
      });
    }
    const subscribe = Bridge.addEventListener(
      'process/filterChanged',
      (value) => {
        setFilter(value);
        getJobs(true, value);
      },
    );

    if (synchronizer.selectedSource === 'synchronizer') {
      synchronizerEvent.getEvent(
        'JOBS/UPDATED',
        debounce(() => {
          getJobs(false, filterRef.current);
        }, 300),
      );
      synchronizerEvent.getEvent(
        'JOBS/ADDED',
        debounce(() => {
          getJobs(false, filterRef.current);
        }, 300),
      );
    }

    return () => {
      if (synchronizer.selectedSource === 'legacy-webhook') {
        removeEvent('rpa_process_completed');
        removeEvent('rpa_process_exceptioned');
        removeEvent('rpa_process_stopped');
        removeEvent('rpa_process_suspened');
        removeEvent('rpa_process_started');
      }
      if (synchronizer.selectedSource === 'synchronizer') {
        synchronizerEvent.removeEvent('JOBS/UPDATED');
        synchronizerEvent.removeEvent('JOBS/ADDED');
      }
      subscribe();
    };
  }, []);

  const modalAPI = React.useCallback(
    async (status, query) => {
      return await getJobsDetailsByStatusAPI(
        status.toLowerCase(),
        undefined,
        undefined,
        filter,
        query,
      );
    },
    [filter],
  );

  return (
    <Spin spinning={isLoading}>
      <CircularGraphV2
        graphData={chartData}
        legend={legend}
        title={
          <>
            Total jobs {'  '} {'  '}
            <CustomTooltip
              content="Jobs are sessions/executions of a process, how many times all process have run since connecting to Turbotic.
              This graph presents all jobs that are filtered on statuses"
            />
          </>
        }
        titleValue={
          <div style={{ marginBottom: 35 }}>{botJobs?.totalJobs || 0}</div>
        }
        id="total-jobs-graph-v2"
        key="total-jobs-graph-v2"
        showPercentageInDecimal
        onClick={async (event, elements) => {
          if (!elements[0]?._chart) {
            return;
          }
          const chart = elements[0]._chart;
          const element = chart.getElementAtEvent(event)[0];
          const status = legend[element._index];

          if (synchronizer.selectedSource === 'legacy-webhook') {
            setJobDetailsModal((oldValue) => ({
              ...oldValue,
              visible: true,
              isLoading: true,
              status: status.name,
            }));
            const res = await getJobsDetailsByStatusAPI(
              status.name.toLowerCase(),
              undefined,
              undefined,
              filter,
            );
            setJobDetailsModal((oldValue) => ({
              ...oldValue,
              isLoading: false,
              data: res || [],
            }));
          } else {
            setJobDetailsModal((oldValue) => ({
              ...oldValue,
              visible: true,
              // isLoading: true,
              status: status.name,
            }));
          }
        }}
      />
      <JobsDetailsModal
        data={jobDetailsModal.data}
        visible={jobDetailsModal.visible}
        handleClose={() => {
          setJobDetailsModal({
            visible: false,
            data: [],
            isLoading: false,
            status: '',
          });
        }}
        status={jobDetailsModal.status}
        isLoading={jobDetailsModal.isLoading}
        getJobsDetailsByStatusAPI={modalAPI}
      />
    </Spin>
  );
};

export interface ChartProps {
  completedJobs: number;
  exceptionedJobs: number;
  stoppedJobs: number;
  suspendedJobs: number;
  totalJobs: number;
}
