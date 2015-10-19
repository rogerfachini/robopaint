/**
 * @file Contains all the required parts for managing flattening of art and
 * creation of toolpath lines for machine tracing fills.
 */
"use strict";
var _ = require('underscore');

// If we're not in a mode environment, set to false.
var mode = (typeof window.mode === 'undefined') ? false : window.mode;

// Settings template: pass any of these options in with the first setup argument
// to override. Second argument then becomes completion callback.
// These values are subject to change by global robopaint.settings defaults, See
// those values for current values.
var settings = {
  path: null, // Pass a path object to only fill that object.
  // Otherwise everything will be traced for fill.
  traceIterationMultiplier: 2, // Amount of work done in each frame.
  lineWidth: 10, // The size of the visual representation of the stroke line.
  flattenResolution: 15, // Path overlay fill type trace resolution.
  fillType: 'zigzag', // zigzag, zigstraight, zigsmooth, overlay
  // Pass a path object to be used for overlay fills:
  overlayFillPath: null, // Otherwise uses giant spiral.
  overlayFillAlignPath: true, // Align overlay fill to path, otherwise align to view.
  angle: 28, // Dynamic line fill type line angle
  randomizeAngle: false, // Randomize the angle above for dynamic line fill.
  hatch: false, // If true, runs twice at opposing angles
  spacing: 13, // Dynamic line fill spacing nominally between each line.
  checkFillOcclusion: true, // Check for occlusion on fills?
  threshold: 40 // Dynamic line grouping threshold
};

// General state variables (reset via shutdown below)
var traceChildrenMax = 0;
var currentTraceChild = 1;
var runFillSpooling = false;
var cFillIndex = 0; // Keep track of which line we're working on
var cSubIndex = 0; // Keep track of which sub we're working on
var cStep = 0; // Which fill step are we on?
var cGroup; // The current line grouping
var lines = []; // Lines to be regrouped during fill
var totalSteps = 0; // Keep track of total step changes for user.
var lastPath = null;

// For overlay fill:
var overlayPathPos = 0; // Position on current tracing path
var lastGood = false; // Keep track if the last hit was good
var tracePaths = [];
var tpIndex = 0; // Current tracePath
var overlayInts = null;
var usedOverlayInts = [];
var spiralPathM = "M2.604,5.327c1.099,0.688-0.393,1.81-1.153,1.813 c-2.06,0.008-2.943-2.415-2.5-4.101c0.792-3.017,4.375-4.153,7.112-3.149C10.081,1.363,11.52,6.182,9.91,9.905 c-2.145,4.962-8.314,6.688-13.071,4.486c-5.986-2.771-8.028-10.214-5.193-15.93c3.434-6.923,12.271-9.25,19.03-5.822 c7.965,4.04,10.615,14.144,6.54,21.844c-4.706,8.89-16.233,11.822-24.989,7.159c-9.95-5.299-13.209-18.078-7.886-27.758 c5.971-10.86,20.197-14.398,30.948-8.495C27.224-8.059,31.095,7.401,24.521,19.06c-7.234,12.831-24.164,16.976-36.907,9.832 c-13.922-7.805-18.405-25.95-10.58-39.586c8.495-14.804,28.131-19.556,42.867-11.168c15.91,9.056,21.004,29.887,11.926,45.5 C22.073,40.414-0.271,45.774-16.998,36.143C-34.896,25.836-40.603,2.317-30.271-15.272c11.014-18.75,36.066-24.717,54.785-13.841 C44.4-17.559,50.719,8.649,39.133,28.215C26.861,48.939-0.901,55.514-21.611,43.393C-43.486,30.589-50.417,1.692-37.577-19.85 c13.53-22.698,44.002-29.881,66.703-16.514C52.99-22.312,60.534,9.275,46.438,32.793C31.651,57.464-1.532,65.256-26.223,50.644 c-25.854-15.3-34.01-49.578-18.66-75.071c16.045-26.646,51.939-35.045,78.621-19.187C61.581-27.067,70.35,9.902,53.745,37.371 C36.442,65.99-2.163,74.998-30.835,57.894C-60.667,40.099-70.049,0.438-52.188-29.005c18.56-30.594,59.876-40.21,90.539-21.86 c31.821,19.043,41.816,61.395,22.7,92.813C41.234,74.517-2.795,84.74-35.448,65.145C-69.258,44.854-79.866-0.188-59.494-33.583 C-38.421-68.125,8.32-78.958,42.963-58.116c35.8,21.538,47.021,69.272,25.393,104.641C46.026,83.043-3.427,94.483-40.06,72.396 C-77.85,49.61-89.684-0.815-66.8-38.16C-43.213-76.652,8.952-88.701,47.575-65.366c39.779,24.033,52.226,77.15,28.086,116.47 C50.818,91.57-4.059,104.227-44.672,79.646C-86.441,54.366-99.5-1.443-74.105-42.738C-48.005-85.179,9.584-98.444,52.188-72.617 c43.758,26.527,57.431,85.028,30.78,128.298C55.61,100.097-4.691,113.97-49.285,86.896C-95.033,59.122-109.318-2.07-81.411-47.315 c28.614-46.39,91.627-60.872,138.211-32.552c47.738,29.021,62.636,92.906,33.473,140.126c-29.87,48.365-95.597,63.456-144.17,33.889 c-49.728-30.269-65.239-96.845-34.82-146.041c31.127-50.339,99.565-66.038,150.129-35.225 c51.717,31.516,67.841,100.784,36.166,151.954C65.195,117.15-5.956,133.458-58.51,101.398 C-112.216,68.635-128.954-3.326-96.022-56.471c33.64-54.289,107.503-71.204,162.047-37.898 c55.696,34.01,73.046,108.663,38.859,163.782C69.988,125.677-6.588,143.201-63.122,108.648 c-57.686-35.257-75.649-112.602-40.206-169.696c36.153-58.239,115.442-76.371,173.965-40.572 c59.676,36.504,78.252,116.541,41.553,175.611C74.781,134.204-7.221,152.945-67.734,115.899 c-61.665-37.751-80.854-120.48-42.899-181.525c38.666-62.188,123.38-81.537,185.883-43.245 c63.655,38.998,83.458,124.419,44.246,187.439C79.573,142.731-7.853,162.688-72.347,123.15 c-65.645-40.245-86.06-128.358-45.593-193.353c41.179-66.137,131.318-86.703,197.801-45.917 c67.635,41.492,88.663,132.297,46.939,199.267C84.366,151.258-8.486,172.433-76.959,130.4 c-69.625-42.739-91.266-136.237-48.286-205.181c43.691-70.087,139.256-91.869,209.719-48.59 c71.614,43.985,93.869,140.176,49.633,211.095C89.159,159.786-9.118,182.177-81.571,137.651 c-73.604-45.232-96.472-144.115-50.979-217.009c46.204-74.036,147.194-97.036,221.637-51.264 c75.594,46.479,99.074,148.055,52.327,222.924c-47.461,76.011-151.164,99.619-227.597,52.6 C-163.767,97.175-187.861-7.092-139.857-83.936c48.717-77.986,155.133-102.202,233.556-53.937 c79.573,48.973,104.28,155.933,55.02,234.752C98.745,176.84-10.384,201.665-90.796,152.152 c-81.563-50.22-106.882-159.872-56.366-240.666c51.23-81.935,163.071-107.368,245.474-56.609 c83.552,51.467,109.485,163.811,57.712,246.58c-52.486,83.91-167.04,109.951-251.433,57.946 c-85.542-52.714-112.088-167.75-59.06-252.494c53.743-85.885,171.009-112.535,257.392-59.283 c87.532,53.961,114.691,171.69,60.406,258.409c-54.999,87.859-174.979,115.118-263.351,60.619 c-89.522-55.208-117.294-175.629-61.753-264.322c56.255-89.834,178.948-117.701,269.31-61.956 c91.511,56.455,119.896,179.568,63.1,270.237c-57.512,91.809-182.917,120.284-275.269,63.292 c-93.501-57.702-122.5-183.508-64.446-276.151c58.768-93.784,186.886-122.867,281.228-64.628 C207.64-107.927,237.25,20.572,177.941,115.19c-60.024,95.758-190.855,125.451-287.188,65.965 c-97.48-60.195-127.705-191.386-67.139-287.979c61.28-97.733,194.824-128.034,293.146-67.301 c99.471,61.442,130.308,195.325,68.486,293.893c-62.537,99.708-198.794,130.617-299.105,68.638 c-101.46-62.689-132.911-199.264-69.833-299.807c63.793-101.683,202.763-133.2,305.064-69.975 c103.45,63.936,135.514,203.204,71.18,305.721c-65.05,103.658-206.732,135.784-311.023,71.312 c-105.44-65.183-138.117-207.143-72.526-311.636c66.306-105.632,210.701-138.367,316.982-72.647 c107.43,66.43,140.72,211.082,73.873,317.55c-67.563,107.607-214.67,140.95-322.941,73.984 c-109.419-67.676-143.322-215.021-75.219-323.464c68.818-109.582,218.639-143.533,328.9-75.32 c111.409,68.923,145.925,218.96,76.566,329.377c-70.075,111.557-222.609,146.117-334.859,76.657 c-113.399-70.17-148.528-222.9-77.913-335.292c71.332-113.531,226.578-148.699,340.819-77.993 c115.389,71.417,151.131,226.839,79.259,341.206c-72.587,115.506-230.547,151.283-346.777,79.33 c-117.379-72.664-153.734-230.778-80.606-347.12c73.844-117.481,234.516-153.866,352.737-80.667 c119.369,73.911,156.336,234.718,81.953,353.034c-75.1,119.456-238.485,156.45-358.696,82.003 C-258.279,149.501-295.859-13.999-220.22-134.29c76.356-121.431,242.455-159.033,364.655-83.34 c123.348,76.404,161.542,242.596,84.646,364.862c-77.613,123.406-246.424,161.616-370.614,84.676 c-125.338-77.651-164.145-246.536-85.993-370.776c78.869-125.38,250.393-164.199,376.573-86.013 c127.328,78.898,166.749,250.475,87.339,376.69C156.261,279.166-17.975,318.593-146.145,239.16 c-129.317-80.145-169.351-254.414-88.686-382.604c81.382-129.33,258.332-169.366,388.491-88.686 c131.308,81.392,171.954,258.354,90.033,388.519c-82.638,131.305-262.3,171.949-394.45,90.022 c-133.297-82.638-174.557-262.292-91.379-394.433c83.895-133.28,266.27-174.532,400.409-91.359 c135.287,83.885,177.159,266.232,92.726,400.347C165.848,296.22-19.241,338.081-155.37,253.661 C-292.646,168.529-335.132-16.51-249.442-152.6c86.407-137.229,274.208-179.699,412.327-94.032 c139.267,86.379,182.365,274.11,95.419,412.175c-87.664,139.204-278.177,182.282-418.286,95.368 c-141.256-87.625-184.968-278.049-96.766-418.089c88.919-141.179,282.146-184.865,424.245-96.705 C310.743-165.01,355.068,28.106,265.61,170.121c-90.176,143.153-286.116,187.448-430.205,98.041 c-145.236-90.119-190.174-285.928-99.459-429.917c91.432-145.128,290.084-190.032,436.163-99.377 c147.226,91.366,192.776,289.867,100.806,435.832C180.227,321.802-21.139,367.313-169.207,275.413 C-318.422,182.8-364.586-18.394-271.359-166.333c93.944-149.078,298.023-195.198,448.081-102.051 c151.205,93.86,197.982,297.746,103.5,447.66C185.02,330.329-21.771,377.058-173.819,282.664 c-153.195-95.107-200.585-301.685-104.846-453.574c96.457-153.028,305.961-200.365,459.999-104.724 C336.52-179.281,384.522,29.99,287.527,183.854c-97.713,155.002-309.931,202.948-465.958,106.06 c-157.175-97.6-205.791-309.563-107.539-465.402c98.97-156.977,313.9-205.531,471.917-107.396 c159.165,98.847,208.394,313.503,108.886,471.316C194.606,347.383-23.037,396.546-183.044,297.165 c-161.154-100.094-210.997-317.442-110.233-477.23c101.482-160.927,321.838-210.698,483.836-110.07 c163.144,101.341,213.6,321.382,111.579,483.145C199.399,355.911-23.669,406.29-187.656,304.416 C-352.791,201.828-403.859-20.905-300.583-184.644C-196.587-349.52,29.194-400.508,195.171-297.386 c167.124,103.834,218.805,329.26,114.273,494.973C204.193,364.438-24.302,416.034-192.269,311.666 c-169.114-105.081-221.409-333.199-115.62-500.887C-201.38-358.047,29.827-410.252,199.784-304.637 C370.887-198.309,423.795,32.502,316.75,202.164C208.986,372.965-24.935,425.778-196.881,318.917 C-369.975,211.342-423.496-22.161-315.194-193.799c109.02-172.775,345.654-226.197,519.59-118.089 C379.479-203.066,433.613,33.13,324.056,206.742C213.779,381.492-25.567,435.522-201.494,326.167 C-378.566,216.099-433.314-22.789-322.5-198.376C-210.967-375.102,31.093-429.74,209.008-319.138 C388.071-207.823,443.432,33.758,331.361,211.319C218.572,390.02-26.2,445.267-206.106,333.418 C-387.159,220.856-443.132-23.417-329.805-202.954c114.045-180.675,361.53-236.53,543.426-123.435 C396.663-212.58,453.25,34.386,338.667,215.897c-115.302,182.65-365.5,239.114-549.385,124.771 C-395.75,225.613-452.95-24.045-337.111-207.531c116.558-184.625,369.469-241.697,555.344-126.108 C405.255-217.337,463.068,35.014,345.973,220.475c-117.814,186.6-373.438,244.28-561.303,127.444 C-404.343,230.37-462.768-24.673-344.417-212.109c119.07-188.574,377.407-246.864,567.262-128.781 c191.002,118.796,250.04,376.531,130.433,565.942C232.952,415.602-28.098,474.499-219.943,355.17 C-412.935,235.127-472.586-25.301-351.722-216.687c121.583-192.524,385.346-252.03,579.18-131.454 C422.439-226.851,482.704,36.27,360.584,229.63C237.745,424.129-28.731,484.243-224.556,362.42 C-421.526,239.884-482.405-25.929-359.028-221.264C-234.933-417.738,34.256-478.461,232.07-355.391 C431.031-231.608,492.522,36.897,367.89,234.208C242.538,432.655-29.364,493.987-229.168,369.671 c-200.951-125.03-263.055-396.228-137.166-595.513c126.608-200.423,401.222-262.363,603.016-136.8 c202.94,126.276,265.658,400.167,138.513,601.427C247.331,441.183-29.997,503.731-233.78,376.921 C-438.71,249.398-502.041-27.185-373.64-230.419c129.121-204.373,409.161-267.53,614.935-139.473 C448.216-241.122,512.159,38.153,382.501,243.363C252.124,449.71-30.629,513.476-238.393,384.172 c-208.91-130.018-273.467-411.985-142.553-619.169c131.633-208.322,417.1-272.696,626.853-142.146 c210.9,131.264,276.069,415.924,143.899,625.083C256.917,458.237-31.262,523.22-243.005,391.423 C-455.895,258.912-521.677-28.44-388.251-239.575C-254.105-451.847,36.787-517.438,250.52-384.394 C465.399-250.636,531.795,39.409,397.112,252.518C261.71,466.765-31.895,532.964-247.617,398.674 c-216.87-135.005-283.878-427.742-147.939-642.826c136.658-216.222,432.976-283.029,650.689-147.492 c218.859,136.251,286.481,431.682,149.286,648.74C266.503,475.292-32.527,542.708-252.229,405.924 C-473.079,268.426-541.313-29.696-402.862-248.73c139.171-220.171,440.915-288.196,662.607-150.165 C482.583-260.15,551.432,40.665,411.724,261.673C271.297,483.819-33.16,552.452-256.842,413.175 c-224.829-139.992-294.29-443.499-153.326-666.482C-268.485-477.428,38.685-546.67,264.357-406.146 C491.176-264.907,561.25,41.293,419.029,266.251C276.09,492.347-33.792,562.196-261.455,420.425 C-490.263,277.94-560.95-30.952-417.474-257.885c144.196-228.07,456.792-298.529,686.443-155.511 C499.768-269.664,571.068,41.921,426.335,270.828C280.883,500.874-34.425,571.94-266.067,427.676 C-498.854,282.697-570.769-31.58-424.779-262.463c146.708-232.02,464.729-303.695,698.361-158.184 C508.359-274.421,580.886,42.549,433.641,275.406C285.676,509.4-35.058,581.685-270.679,434.927 C-507.447,287.454-580.586-32.208-432.085-267.04c149.221-235.97,472.668-308.862,710.279-160.857 c238.757,148.719,312.51,471.074,162.752,707.881C290.469,517.928-35.691,591.429-275.292,442.177 C-516.039,292.211-590.405-32.836-439.391-271.618c151.733-239.919,480.606-314.028,722.197-163.53 C525.543-283.935,600.522,43.805,448.252,284.561C295.263,526.455-36.323,601.173-279.904,449.428 C-524.631,296.968-600.223-33.464-446.696-276.195c154.246-243.869,488.545-319.196,734.115-166.203 C534.136-288.692,610.341,44.433,455.558,289.139C300.056,534.982-36.956,610.917-284.517,456.679 C-533.223,301.725-610.041-34.092-454.002-280.773c156.758-247.818,496.483-324.362,746.033-168.876 c250.696,156.2,328.128,494.71,170.833,743.366C304.849,543.51-37.589,620.662-289.129,463.929 C-541.815,306.482-619.859-34.72-461.308-285.351C-302.037-537.119,43.114-614.879,296.644-456.9 C551.319-298.206,629.977,45.688,470.169,298.294C309.643,552.037-38.222,630.406-293.741,471.18 c-256.666-159.94-335.937-506.527-174.872-761.108C-306.83-545.646,43.747-624.624,301.256-464.15 C559.911-302.963,639.795,46.316,477.475,302.872C314.436,560.564-38.854,640.15-298.354,478.431 C-558.999,315.996-639.496-35.976-475.919-294.506c164.296-259.667,520.299-339.862,781.788-176.896 C568.504-307.72,649.613,46.944,484.781,307.449C319.229,569.092-39.487,649.895-302.966,485.681 C-567.591,320.753-649.314-36.604-483.225-299.083C-316.417-562.701,45.012-644.112,310.48-478.652 C577.096-312.478,659.432,47.572,492.087,312.027C324.021,577.619-40.12,659.639-307.578,492.932 C-576.183,325.51-659.132-37.232-490.531-303.661c169.321-267.567,536.176-350.195,805.624-182.241 C585.688-317.234,669.25,48.2,499.393,316.604C328.814,586.146-40.752,669.383-312.191,500.182 C-584.775,330.268-668.95-37.86-497.836-308.239C-326.002-579.755,46.277-663.6,319.706-493.153 C594.279-321.991,679.068,48.828,506.698,321.182c-173.09,273.491-548.083,357.945-823.501,186.25 c-276.564-172.408-361.965-545.92-188.339-820.249c174.346-275.466,552.052-360.528,829.46-187.587 C602.872-326.749,688.887,49.456,514.004,325.76C338.401,603.2-42.018,688.871-321.416,514.684 C-601.959,339.781-688.587-39.116-512.448-317.394c176.859-279.416,559.991-365.694,841.378-190.26 C611.464-331.505,698.704,50.084,521.31,330.337C343.194,611.728-42.65,698.615-326.028,521.934 C-610.551,344.539-698.405-39.744-519.753-321.972c179.371-283.365,567.929-370.861,853.296-192.933 c286.513,178.642,374.979,565.617,195.072,849.82C347.987,620.255-43.283,708.359-330.64,529.185 C-619.143,349.295-708.223-40.372-527.059-326.549c181.884-287.315,575.868-376.027,865.214-195.606 C628.647-341.02,718.341,51.34,535.921,339.493C352.78,628.782-43.916,718.104-335.252,536.436 C-627.735,354.053-718.041-41-534.365-331.127c184.396-291.265,583.806-381.194,877.132-198.279 C637.24-345.776,728.159,51.968,543.227,344.07C357.574,637.31-44.549,727.848-339.865,543.686 C-636.327,358.81-727.859-41.627-541.67-335.705c186.909-295.214,591.744-386.361,889.05-200.952 C645.832-350.534,737.978,52.596,550.532,348.647C362.367,645.837-45.182,737.592-344.478,550.937 c-300.441-187.37-393.2-593.192-204.499-891.219C-359.555-639.446,50.707-731.81,351.992-543.907 C654.424-355.291,747.795,53.224,557.838,353.225C367.16,654.364-45.814,747.336-349.09,558.188 C-653.511,368.324-747.496-42.883-556.282-344.859c191.934-303.114,607.622-396.694,912.887-206.299 c306.411,191.11,401.009,605.01,208.539,908.961C371.953,662.892-46.447,757.08-353.702,565.438 C-662.103,373.081-757.314-43.511-563.588-349.438c194.447-307.063,615.56-401.86,924.805-208.971 C671.607-364.805,767.432,54.479,572.449,362.38C376.746,671.418-47.08,766.824-358.314,572.688 C-670.695,377.838-767.132-44.139-570.894-354.015c196.959-311.013,623.498-407.027,936.723-211.645 C680.2-369.562,777.25,55.107,579.755,366.958C381.54,679.945-47.712,776.568-362.927,579.938 c-316.36-197.344-414.024-624.706-215.272-938.531C-378.728-673.555,53.237-770.786,370.441-572.91 C688.792-374.319,787.068,55.735,587.061,371.536c-200.728,316.937-635.406,414.777-954.6,215.654 c-186.498-116.343-308.25-318.863-323.028-536.97";
var spiralPath = null;
var getClosestIntersectionID = paper.utils.getClosestIntersectionID;

module.exports = function(paper) {
  // Emulate PaperScript "Globals" as needed
  var Point = paper.Point;
  var Path = paper.Path;
  var view = paper.view;

  // Shortcuts for long lines.
  var snapColorID = paper.utils.snapColorID;
  var snapColor = paper.utils.snapColor;
  var getClosestIntersectionID = paper.utils.getClosestIntersectionID;

  paper.fill = {
    settings: settings,

    setup: function (overrides, callback) {
      if (_.isFunction(overrides)) callback = overrides; // No overrides

      // Get global Settings
      var set = robopaint.settings;

      var setMap = { // Map global settings to local stroke module settings.
        traceIterationMultiplier: parseInt(set.autofilliteration),
        lineWidth: parseInt(set.autofillwidth),
        flattenResolution: parseInt(set.fillprecision) * 2,
        fillType: set.filltype,
        overlayFillAlignPath: set.fillspiralalign == true,
        angle: parseInt(set.fillangle),
        randomizeAngle: set.fillrandomize == true,
        hatch: set.fillhatch == true,
        spacing: parseInt(set.fillspacing) * 2,
        checkFillOcclusion: set.fillocclusionfills == true,
        threshold: parseInt(set.fillgroupingthresh)
      }

      // Merge in local settings, global settings, and passed overrides.
      settings = _.extend(settings, setMap, overrides);

      // TODO: I'm in denial that the only valid overlay path is a spiral...
      // till then, i'm going to swap in overlay w/o a path for spiral :P
      if (settings.fillType === 'spiral') {
        settings.fillType = 'overlay';
      }

      // Specific setup modifications for overlay mode
      if (settings.fillType === 'overlay') {
        settings.hatch = false; // No hatch on overlay
        spiralPath = new Path(spiralPathM);
        spiralPath.scale(settings.spacing / 9); // Scale to match line spacing
        settings.traceIterationMultiplier = settings.traceIterationMultiplier * 2;
      }

      paper.fill.complete = callback; // Assign callback
      var tmp = paper.canvas.tempLayer;
      tmp.activate();
      tmp.removeChildren(); // Clear it out

      // Move through all child items in the mainLayer and copy them into temp
      for (var i = 0; i < paper.canvas.mainLayer.children.length; i++) {
        var path = paper.canvas.mainLayer.children[i];
        var t = path.copyTo(tmp);

        // If this is the only path we'll be tacing...
        if (settings.path === path) {
          // Mark the new temp path copy.
          t.data.targetPath = true;
        }
      }

      // Ungroup all groups copied
      paper.utils.ungroupAllGroups(tmp);

      // Filter out non-fill paths, and ensure paths are closed.

      // If you modify the child list, you MUST operate on a COPY
      var kids = _.extend([], tmp.children);
      _.each(kids, function(path) {
        if (!paper.utils.hasColor(path.fillColor)) {
          path.remove();
        } else {
          path.closed = true;
          path.data.color = snapColorID(path.fillColor, path.opacity);
          path.data.name = path.name;
          path.fillColor = snapColor(path.fillColor, path.opacity);
          path.strokeWidth = 0;
          path.strokeColor = null;
        }
      });

      // Move through each temp layer child and subtract each layer from the
      // previous, again and again, only if we're checking occlusion.
      if (settings.checkFillOcclusion) {
        for (var srcIndex = 0; srcIndex < tmp.children.length; srcIndex++) {
          var srcPath = tmp.children[srcIndex];
          srcPath.data.processed = true;

          // Replace this path with a subtract for every intersecting path, starting
          // at the current index (lower paths don't subtract from higher ones)
          for (var destIndex = srcIndex; destIndex < tmp.children.length; destIndex++) {
            var destPath = tmp.children[destIndex];
            if (destIndex !== srcIndex) {
              var tmpPath = srcPath; // Hold onto the original path
              // Set the new srcPath to the subtracted one inserted at the same index
              srcPath = tmp.insertChild(srcIndex, srcPath.subtract(destPath));
              srcPath.data.color = tmpPath.data.color;
              srcPath.data.name = tmpPath.data.name;
              srcPath.data.targetPath = tmpPath.data.targetPath;
              tmpPath.remove(); // Remove the old srcPath
            }
          }
        }
      }

      // Keep the user up to date
      if (settings.path) {
        // We have to deal with all the paths, but we're only filling one.
        traceChildrenMax = 1;

        // Hide the final paths for single path filling
        _.each(tmp.children, function(path){
          if (settings.path && !path.data.targetPath) {
            path.opacity = 0;
          }
        });
      } else {
        traceChildrenMax = tmp.children.length;
      }

      currentTraceChild = 1;
      if (mode) {
        mode.run([
          ['status', i18n.t('libs.spool.fill', {id: '1/' + traceChildrenMax}), true],
          ['progress', 0, traceChildrenMax * 2] // 2 steps for fill: lines & groups
        ]);
      }

      // Begin the trace, write to the actionLayer
      paper.canvas.actionLayer.activate();
      runFillSpooling = true;
    },

    onFrameStep: function() {
      for(var i = 0; i < settings.traceIterationMultiplier; i++) {
        if (runFillSpooling) { // Are we doing fills?
          if (!traceFillNext()){ // All paths complete?
            paper.fill.shutdown();

            if (settings.hatch === true) {
              settings.hatch = false;
              settings.angle+= 90;
              paper.fill.setup(_.extend({}, settings));
              return;
            }

            if (_.isFunction(paper.fill.complete)) {
              paper.fill.complete();
            }
          };
        }
      }
    },

    shutdown: function() {
      runFillSpooling = false;
      traceChildrenMax = 0;
      currentTraceChild = 1;
      cFillIndex = 0;
      cSubIndex = 0;
      cStep = 0;
      cGroup;
      lines = [];
      totalSteps = 0;
      lastPath = null;
      settings.path = null; // Only kept per setup run.

      if (spiralPath) {
        spiralPath.remove();
        spiralPath = null;
      }

      if (settings.fillType === 'overlay') {
        overlayPathPos = 0;
        lastGood = false;
        tracePaths = [];
        tpIndex = 0;
        overlayInts = null;
      }
    }
  };


  function traceFillNext() {
    // 1. Assume line is ALWAYS bigger than the entire object
    // 2. If filled path, number of intersections will ALWAYS be multiple of 2
    // 3. Grouping pairs will always yield complete line intersections.
    var fillPath = paper.canvas.tempLayer.firstChild;

    // If we're not checking occlusion, we need to grab the top layer.
    if (!settings.checkFillOcclusion && settings.fillType === 'overlay') {
      fillPath = paper.canvas.tempLayer.lastChild;
    }

    if (!fillPath) return false;

    // Ignore white paths (color id 8)
    // TODO: This should probably be handled depending on number of colors in the
    // media (you can have more pens than 8), paper color might not be white.
    if (fillPath.data.color === 'color8') {
      fillPath.remove();
      return true;
    }

    // I've we're only filling one path, delete any we encounter that aren't it.
    // This allows for seamless path occlusion tracing without side effects.
    if (settings.path) {
      if (!fillPath.data.targetPath) {
        fillPath.remove();
        return true;
      }
    }

    // Ignore 0 width/height fill paths.
    if (fillPath.bounds.width === 0 || fillPath.bounds.height === 0) {
      fillPath.remove(); return true;
    }

    // What kind of fill are we doing?
    switch(settings.fillType) {
      case 'zigzag':
      case 'zigstraight':
      case 'zigsmooth':
        return dynamicLineFillNext(fillPath, settings.fillType);
        break;
      case 'overlay':
        var path = settings.overlayFillPath ? settings.overlayFillPath : spiralPath;
        return overlayLineFillNext(fillPath, path)
        break;
    }
  }

  // Dyanamic line fill iterative function (called from traceFillNext)
  function overlayLineFillNext(fillPath, overlayPath) {
    var tmp = paper.canvas.tempLayer;

    if (settings.debug) {
      overlayPath.strokeWidth = 2;
      overlayPath.strokeColor = "red";
    }

    // This happens only once per fillPath, at the very start:
    if (overlayInts === null) {
      // Align to path or to view?
      if (settings.overlayFillAlignPath) {
        overlayPath.position = fillPath.position;
      } else {
        overlayPath.position = view.center;
      }

      // Save the intersections
      overlayInts = overlayPath.getIntersections(fillPath);
    }

    // Current trace path doesn't exist? Make it!
    if (!tracePaths[tpIndex]) {
      tracePaths[tpIndex] = new Path({
        strokeColor: fillPath.fillColor,
        data: {color: fillPath.data.color, name: fillPath.data.name, type: 'fill'},
        strokeWidth: settings.lineWidth,
        strokeCap: 'round',
        miterLimit: 1
      });

      // Make Water preview paths blue and transparent
      if (tracePaths[tpIndex].data.color === 'water2') {
        tracePaths[tpIndex].strokeColor = '#256d7b';
        tracePaths[tpIndex].opacity = 0.5;
      }
    }

    var tp = tracePaths[tpIndex];

    // Check if the current point matches the hittest
    var testPoint = overlayPath.getPointAt(overlayPathPos);

    var h = tmp.hitTest(testPoint, {stroke: false, fill: true});

    // Standard fill/stroke checking: if the hit result item is the same as
    // our current path, keep going!
    var continueStroke = h ? (h.item === fillPath) : false;

    var closestID = -1;
    // If the above rules say we're to keep filling.. lets go!
    if (continueStroke) {
      // If we came off a bad part of the path, add the closest intersection
      if (!lastGood && overlayPathPos !== 0) {
        closestID = getClosestIntersectionID(testPoint, overlayInts);
        tp.add(overlayInts[closestID].point);
      }

      tp.add(testPoint);
      lastGood = true;
    } else { // We're obstructed
      if (tp.segments.length) {
        tpIndex++; // Increment only if this path is used
      }

      lastGood = false;
    }

    // If we snapped to an intersection point, remove it from the list
    if (closestID !== -1) {
      overlayInts.splice(closestID, 1);
    }

    // Test to see if we're done filling the fillPath! =========================
    var pathComplete = false; // Assume we're not done

    // If we're fully beyond the fill boundaries on aligned path mode we're done
    if (settings.overlayFillAlignPath) {
      pathComplete = paper.utils.pointBeyond(testPoint, fillPath.bounds);
      if (pathComplete && settings.debug) console.log('Completed overlay fill via outside bounds (slow).') ;
    }

    // If we've gone beyond the length of the overlayPath... well, then we
    // likely didn't completely fill the darn thing.. oh well, better than an
    // error I suppose! :/
    if (!pathComplete &&
        overlayPathPos+settings.flattenResolution > overlayPath.length) {
      if (settings.debug) console.log('Completed overlay fill via path length (sorry!).');
      pathComplete = true;
    }

    // If we're completely out of overlayPath intersections.. we must be done!
    if (!pathComplete && overlayInts.length === 0) {
      pathComplete = true;
      if (settings.debug) console.log('Completed overlay fill via intersection depletion (fast!).');
    }

    // If we didn't normally hit the path, cheat till we do!
    if (!continueStroke && !pathComplete) {
      while (overlayPathPos < overlayPath.length && !continueStroke && !pathComplete) {
        overlayPathPos+= settings.flattenResolution;
        testPoint = overlayPath.getPointAt(overlayPathPos);
        h = tmp.hitTest(testPoint, {stroke: false, fill: true});
        continueStroke = h ? (h.item === fillPath) : false;

        if (settings.overlayFillAlignPath) {
          pathComplete = paper.utils.pointBeyond(testPoint, fillPath.bounds);
          if (pathComplete && settings.debug) console.log('Completed overlay fill via outside bounds (slow).') ;
        }
      }

      // If we succeeded in finding the next spot, roll back one.
      if (continueStroke) {
        overlayPathPos-= settings.flattenResolution;
      }
    }

    // Did we complete the path?
    if (pathComplete) {
      if (currentTraceChild !== traceChildrenMax) currentTraceChild++;

      fillPath.remove();
      lastGood = false;
      overlayInts = null;
      overlayPathPos = 0;
      totalSteps++;
      if (tp.length > 0) { // Increment only if this path is used
        tpIndex++;
      } else { // If it wasn't used, can it so the next one gets a clean start.
        tp.remove();
        tracePaths[tpIndex] = null;
      }

      if (mode) {
        mode.run('status', i18n.t('libs.spool.fill', {id: currentTraceChild + '/' + traceChildrenMax}), true);
        mode.run('progress', totalSteps);
      }
    } else { // Next part of the path
      overlayPathPos+= settings.flattenResolution; // Increment the path position.
    }

    return true;
  }

  // Dyanamic line fill iterative function (called from traceFillNext)
  function dynamicLineFillNext(fillPath, type) {
    var p = fillPath;

    // Run once per unique fillPath
    if (lastPath !== fillPath) {
      lastPath = fillPath;

      // Swap angle for random angle if randomizeAngle set.
      if (settings.randomizeAngle) {
        settings.angle = Math.ceil(Math.random() * 179);
      }
    }

    // Choose the iteration fill step
    switch (cStep) {
      case 0: // Adding initial fill lines
        // Init boundpath and traversal line
        // The path drawn around the object the line traverses
        var boundPath = new Path.Ellipse({
          center: p.position,
          size: [p.bounds.width * 2 , p.bounds.height * 2]
        });

        // Set start & destination based on input angle
        // Divide the length of the bound ellipse into 1 part per angle
        var amt = boundPath.length/360;

        // Set source position to calculate iterations and create destination vector
        var pos = amt * (settings.angle);

        // The actual line used to find the intersections
        // Ensure line is far longer than the diagonal of the object
        var line = new Path({
          segments: [new Point(0, 0), new Point(p.bounds.width + p.bounds.height, 0)],
          position: boundPath.getPointAt(pos),
          rotation: settings.angle - 90
        });

        if (settings.debug) {
          boundPath.strokeColor= 'black';
          boundPath.strokeWidth= 2;
          line.strokeColor = 'red';
          line.strokeWidth = 2;
          paper.view.update();
        }

        // Find destination position on other side of circle
        pos = settings.angle + 180;  if (pos > 360) pos -= 360;
        var len = Math.min(boundPath.length, pos * amt);
        var destination = boundPath.getPointAt(len);

        // Find vector and vector length divided by line spacing to get # iterations.
        var vector = destination.subtract(line.position);
        var iterations = parseInt(vector.length / settings.spacing);
        line.position = line.position.add(vector.divide(iterations).multiply(cFillIndex)); // Move the line

        // Move through calculated iterations for given spacing
        var ints = checkBoundaryIntersections(line, line.getIntersections(p));

        if (ints.length % 2 === 0) { // If not dividable by 2, we don't want it!
          for (var x = 0; x < ints.length; x+=2) {

            var groupingID = findLineFillGroup(ints[x].point, lines, settings.threshold);

            var y = new Path({
              segments: [ints[x].point, ints[x+1].point],
              strokeColor: p.fillColor, // Will become fill color
              data: {color: p.data.color, name: p.data.name, type: 'fill'},
              strokeWidth: settings.lineWidth,
              miterLimit: 40,
              strokeJoin: 'round'
            });

            // Make Water preview paths blue and transparent
            if (y.data.color === 'water2') {
              y.strokeColor = '#256d7b';
              y.opacity = 0.5;
            }

            if (!lines[groupingID]) lines[groupingID] = [];
            lines[groupingID].push(y);
          }
        }

        cFillIndex++;

        // Num of iterations reached? Move to the next step & reset fillIndex
        if (cFillIndex === iterations) {
          cStep++;
          cFillIndex = 0;
          cSubIndex = 0;
          totalSteps++;
        }

        // Clean up our helper paths
        if (!settings.debug) {
          line.remove();
          boundPath.remove();
        }

        break;
      case 1: // Grouping and re-grouping the lines
        // Combine lines within position similarity groupings

        // If there are none, then the first step didn't ever actually touch the
        // shape. Must be pretty small! Finish up early.
        if (!lines[0]) {
          finishFillPath(fillPath);
          return true;
        }

        if (cSubIndex === 0) {
          if (!lines[cFillIndex]) {
            console.log(cFillIndex)
          }
          if (type === 'zigsmooth' && cGroup) {
            cGroup.simplify();
            cGroup.flatten(settings.flattenResolution);
          }

          cGroup = lines[cFillIndex][0];
          cSubIndex = 1;
        }

        if (typeof lines[cFillIndex][cSubIndex] !== 'undefined') {
          // Don't join lines that cross outside the path
          var v = new Path({
            segments: [cGroup.lastSegment.point, lines[cFillIndex][cSubIndex].firstSegment.point]
          });

          //console.log('ints', v.getIntersections(p).length);

          // Find a point halfway between where these lines would be connected
          // If it's not within the path, don't do it!
          // TODO: This only removes the bad outliers, may need improvement!
          if (!p.contains(v.getPointAt(v.length/2)) || v.getIntersections(p).length > 3) {
            if (type === 'zigsmooth') {
              cGroup.simplify();
              cGroup.flatten(settings.flattenResolution);
            }

            // Not contained, store the previous l & start a new grouping;
            cGroup = lines[cFillIndex][cSubIndex];
            //console.log('Tossed!');
          } else {
            // For straight/smooth zigzag, flip the lines around before joining
            // to ensure the line tries to join to the closest side.
            if (type === 'zigstraight' || type === 'zigsmooth') {
              var cLine = lines[cFillIndex][cSubIndex];
              var groupPoint = cGroup.lastSegment.point;
              var lastToFirst = groupPoint.getDistance(cLine.firstSegment.point);
              var lastToLast = groupPoint.getDistance(cLine.lastSegment.point);
              if (lastToFirst > lastToLast) {
                cLine.reverse();
              }
            }

            // Join the current grouping and the next line
            cGroup.join(lines[cFillIndex][cSubIndex]);
          }

          // Remove our test line
          v.remove();
        }

        cSubIndex++; // Iterate subIndex

        // End of SubIndex Loop (multi)
        if (cSubIndex >= lines[cFillIndex].length) {
          cSubIndex = 0;

          cFillIndex++;
          if (cFillIndex >= lines.length) { // End of fill index loop (single)
            finishFillPath(fillPath);
            return true;
          }
        }
    }

    if (mode) {
      mode.run('progress', totalSteps);
    }
    return true;
  }

  function finishFillPath(fillPath) {
    cFillIndex = 0;
    cSubIndex = 0;
    lines = [];

    totalSteps++;
    if (currentTraceChild !== traceChildrenMax) currentTraceChild++;

    if (mode) {
      mode.run('status', i18n.t('libs.spool.fill', {id: currentTraceChild + '/' + traceChildrenMax}), true);
      mode.run('progress', totalSteps);
    }

    cStep = 0;

    fillPath.remove(); // Actually remove the path (not needed anymore)
  }

  function findLineFillGroup(testPoint, lines, newGroupThresh){
    // If we don't have any groups yet.. return 0
    if (lines.length === 0) {
      return 0;
    }

    // 1. We go in order, which means the first segment point of the last
    //    line in each group is the one to check distance against
    // 2. Compare each, use the shortest...
    // 3. ...unless it's above the new group threshold, then return a group id

    var bestDistance = newGroupThresh;
    var groupID = 0;
    for (var i = 0; i < lines.length; i++) {
      var dist = lines[i][lines[i].length-1].firstSegment.point.getDistance(testPoint);

      if (dist < bestDistance) {
        groupID = i;
        bestDistance = dist;
      }
    }

    // Check if we went over the threshold, make a new group!
    if (bestDistance === newGroupThresh) {
      groupID = lines.length;
    }

    return groupID;
  }

  // If any given intersections that are outside the view bounds, move them to the
  // nearest view boundary intersection
  function checkBoundaryIntersections(line, intersections) {
    // Init canvas boundary line to intersect if beyond the printable area.
    var canvasBounds = new Path.Rectangle({
      from: [0, 0],
      to: [view.bounds.width, view.bounds.height]
    });

    var outPoints = [];

    var canvasBoundInts = line.getIntersections(canvasBounds);
    _.each(intersections, function(int) {
      // If the path intersection is out of bounds...
      if (int.point.x < view.bounds.left || int.point.x > view.bounds.right ||
          int.point.y < view.bounds.top || int.point.y > view.bounds.bottom) {

        // ...and only if the line intersects the boundary of the view:
        // Pick the closest boundary point add it as the incoming point.
        if (canvasBoundInts.length) {
          outPoints.push(canvasBoundInts[getClosestIntersectionID(int.point, canvasBoundInts)]);
        } else {
          // This point is part of a line that doesn't intersect the view bounds,
          // and is outside the view bounds, therefore it is not visible.
          // Do not add it to the output set of points.
        }

        /* Though somewhat counterintuitive, this can definitely happen:
         * Given a shape that extends "far" beyond a corner or side of the view,
         * the intersection fill line never touches the canvas boundary on that
         * fill iteration, even if it properly intersects the shape.
         *
         *        / < Fill line
         *  ____/_________
         * |  / _ _ _ _ _|_ _ _ _
         * |/  | ^(0,0)  | ^ View bounds
         * |__ |_________|
         *     |
         *     |
        **/
      } else {
        outPoints.push(int);
      }
    });

    canvasBounds.remove();
    return outPoints;
  }

};
