using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Auto_Wash.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleTransferSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "registrationimageurl",
                table: "vehicles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ownershiptransferrequests",
                columns: table => new
                {
                    transferrequestid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    vehicleid = table.Column<int>(type: "integer", nullable: false),
                    currentownercustomerid = table.Column<int>(type: "integer", nullable: false),
                    requestedcustomerid = table.Column<int>(type: "integer", nullable: false),
                    registrationimageurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ocrplate = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ownerdecision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ownerconfirmedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    approvedby = table.Column<int>(type: "integer", nullable: true),
                    approvedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updatedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ownershiptransferrequests", x => x.transferrequestid);
                    table.ForeignKey(
                        name: "fk_ownershiptransferrequests_accounts_approvedby",
                        column: x => x.approvedby,
                        principalTable: "accounts",
                        principalColumn: "accountid",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_ownershiptransferrequests_customers_currentownercustomerid",
                        column: x => x.currentownercustomerid,
                        principalTable: "customers",
                        principalColumn: "customerid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ownershiptransferrequests_customers_requestedcustomerid",
                        column: x => x.requestedcustomerid,
                        principalTable: "customers",
                        principalColumn: "customerid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_ownershiptransferrequests_vehicles_vehicleid",
                        column: x => x.vehicleid,
                        principalTable: "vehicles",
                        principalColumn: "vehicleid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vehicleownershiphistory",
                columns: table => new
                {
                    historyid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    vehicleid = table.Column<int>(type: "integer", nullable: false),
                    customerid = table.Column<int>(type: "integer", nullable: false),
                    fromdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    todate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    transferrequestid = table.Column<int>(type: "integer", nullable: true),
                    transfertype = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vehicleownershiphistory", x => x.historyid);
                    table.ForeignKey(
                        name: "fk_vehicleownershiphistory_customers_customerid",
                        column: x => x.customerid,
                        principalTable: "customers",
                        principalColumn: "customerid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_vehicleownershiphistory_ownershiptransferrequests_transferr~",
                        column: x => x.transferrequestid,
                        principalTable: "ownershiptransferrequests",
                        principalColumn: "transferrequestid",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_vehicleownershiphistory_vehicles_vehicleid",
                        column: x => x.vehicleid,
                        principalTable: "vehicles",
                        principalColumn: "vehicleid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "uq_loyaltytransactions_bookingid_earn",
                table: "loyaltytransactions",
                column: "bookingid",
                unique: true,
                filter: "transactiontype = 'Earn'");

            migrationBuilder.CreateIndex(
                name: "ix_ownershiptransferrequests_approvedby",
                table: "ownershiptransferrequests",
                column: "approvedby");

            migrationBuilder.CreateIndex(
                name: "ix_ownershiptransferrequests_currentownercustomerid",
                table: "ownershiptransferrequests",
                column: "currentownercustomerid");

            migrationBuilder.CreateIndex(
                name: "ix_ownershiptransferrequests_requestedcustomerid",
                table: "ownershiptransferrequests",
                column: "requestedcustomerid");

            migrationBuilder.CreateIndex(
                name: "ix_ownershiptransferrequests_vehicleid",
                table: "ownershiptransferrequests",
                column: "vehicleid");

            migrationBuilder.CreateIndex(
                name: "ix_vehicleownershiphistory_customerid",
                table: "vehicleownershiphistory",
                column: "customerid");

            migrationBuilder.CreateIndex(
                name: "ix_vehicleownershiphistory_transferrequestid",
                table: "vehicleownershiphistory",
                column: "transferrequestid");

            migrationBuilder.CreateIndex(
                name: "ix_vehicleownershiphistory_vehicleid",
                table: "vehicleownershiphistory",
                column: "vehicleid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "vehicleownershiphistory");

            migrationBuilder.DropTable(
                name: "ownershiptransferrequests");

            migrationBuilder.DropIndex(
                name: "uq_loyaltytransactions_bookingid_earn",
                table: "loyaltytransactions");

            migrationBuilder.DropColumn(
                name: "registrationimageurl",
                table: "vehicles");
        }
    }
}
