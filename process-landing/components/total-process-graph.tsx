import { Spin } from 'antd';
import React from 'react';
import Bridge from '../../../../../common/bridge/Bridge';
import useSocket from '../../../../../common/hooks/useSocket';
import CustomTooltip from '../../../../custom-tooltip';
import CircularGraphV2 from '../../../../graphs/circular-graph-v2';

const legend = [
  {
    color: '#53B563',
    name: 'Linked',
  },
  {
    color: '#6E7D91',
    name: 'Unlinked',
  },
];

export const TotalProcessGraph = ({
  getTotalProcessesCountAPI,
  organisationId,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [process, setProcess] = React.useState<any>({});
  const { getEvent, removeEvent } = useSocket(`${organisationId}/RPAProcesses`);
  const graphData = React.useMemo(() => {
    if (process && Object.entries(process).length > 0) {
      return [process.linkedProcessCount, process.unlinkedProcessCount];
    }
    return [];
  }, [process]);

  const getData = React.useCallback(async (isLoadingNeeded = true) => {
    setIsLoading(isLoadingNeeded && true);
    const response = await getTotalProcessesCountAPI();
    setProcess(response);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    getData();
    const unsubscribe = Bridge.addEventListener(
      'control-v2/on-process-sync',
      () => getData(),
    );
    getEvent('rpa_process_linked', () => {
      getData(false);
    });
    getEvent('rpa_process_unlinked', () => {
      getData(false);
    });
    return () => {
      removeEvent('rpa_process_linked');
      removeEvent('rpa_process_unlinked');
      unsubscribe();
    };
  }, []);

  return (
    <Spin spinning={isLoading}>
      <div className="mt-5 total-process-graph-container">
        <CircularGraphV2
          graphData={graphData}
          legend={legend}
          title={
            <>
              Total processes {'  '}
              <CustomTooltip
                content="Processes are the processes from your vendors that are connected to Turbotic sorted per connected environment. 
                The Chart displays number of process (Uipath, Blueprism) and workflows (PA)"
              />
            </>
          }
          titleValue={
            <div style={{ marginBottom: 35 }}>
              {process?.totalproceessCount || 0}
            </div>
          }
          key="total-process-graph"
          id="total-process-graph"
        />
      </div>
    </Spin>
  );
};
