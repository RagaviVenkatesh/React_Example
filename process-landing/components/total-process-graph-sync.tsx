import { Spin } from 'antd';
import React from 'react';
import CircularGraphV2 from '../../../../graphs/circular-graph-v2';
import TenantDetailsModal from '../../utils/tenant-details-modal';
import { getTenantDetails } from '../../../../../services/synchronizer/utils/convert-data';
import Bridge from '../../../../../common/bridge/Bridge';
import useSocket, {
  getControlRoom,
} from '../../../../../common/hooks/useSocket';
import { debounce } from 'lodash';
import CustomTooltip from '../../../../custom-tooltip';

const TotalProcessesGraphSync = ({
  getTotalProcessesCountAPI,
  organisationId,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [graphData, setGraphData] = React.useState({
    data: [],
    legend: [],
    othersData: [],
    total: 0,
  });
  const [tenantDetailsModal, setTenantDetailsModal] = React.useState({
    visible: false,
    data: [],
    isLoading: false,
    status: '',
    selectedItem: null,
  });
  const [filter, setFilter] = React.useState([]);
  const filterRef = React.useRef([]);
  filterRef.current = filter;
  const synchronizerEvent = useSocket(getControlRoom(organisationId));

  const getData = async (needLoading = true, functionId = []) => {
    setIsLoading(needLoading && true);
    const res = await getTotalProcessesCountAPI(functionId);
    const finalData = getTenantDetails(res);
    setGraphData(finalData);
    setIsLoading(false);
  };

  React.useEffect(() => {
    const filterLs = localStorage.getItem('processFilter');
    const filterLsArray = filterLs ? filterLs.split(',').filter((f) => f) : [];
    setFilter(filterLsArray);
    getData(true, filterLsArray);

    const subscribe = Bridge.addEventListener(
      'process/filterChanged',
      (value) => {
        setFilter(value);
        getData(true, value);
      },
    );

    synchronizerEvent.getEvent(
      'PROCESSES/UPDATED',
      debounce(() => {
        getData(false, filterRef.current);
      }, 300),
    );
    synchronizerEvent.getEvent(
      'PROCESSES/ADDED',
      debounce(() => {
        getData(false, filterRef.current);
      }, 300),
    );
    synchronizerEvent.getEvent(
      'PROCESSES/DELETED',
      debounce(() => {
        getData(false, filterRef.current);
      }, 300),
    );

    return () => {
      subscribe();
      synchronizerEvent.removeEvent('PROCESSES/UPDATED');
      synchronizerEvent.removeEvent('PROCESSES/ADDED');
      synchronizerEvent.removeEvent('PROCESSES/DELETED');
    };
  }, []);

  return (
    <Spin spinning={isLoading}>
      <div className="mt-5 total-process-graph-container">
        <CircularGraphV2
          id="solution-deployment-per-function-graph"
          graphData={graphData.data}
          legend={graphData.legend}
          showPercentageInDecimal
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
            <div style={{ marginBottom: 32 }}>{graphData.total || 0}</div>
          }
          onClick={async (event, elements) => {
            if (!elements[0]?._chart) {
              return;
            }
            const chart = elements[0]._chart;
            const element = chart.getElementAtEvent(event)[0];
            const tenant = graphData.legend[element._index];
            if (tenant.name === 'Others') {
              setTenantDetailsModal((oldValue) => ({
                ...oldValue,
                visible: true,
                isLoading: false,
                data: graphData.othersData,
                selectedItem: 'Processes',
              }));
            }
          }}
        />
        <TenantDetailsModal
          data={tenantDetailsModal.data}
          selectedItem={tenantDetailsModal.selectedItem}
          visible={tenantDetailsModal.visible}
          handleClose={() => {
            setTenantDetailsModal({
              visible: false,
              data: [],
              isLoading: false,
              status: '',
              selectedItem: null,
            });
          }}
          status={tenantDetailsModal.status}
          isLoading={tenantDetailsModal.isLoading}
        />
      </div>
    </Spin>
  );
};

export default TotalProcessesGraphSync;
